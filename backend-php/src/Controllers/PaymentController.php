<?php

namespace App\Controllers;

use App\Models\Order;
use App\Models\DiscountCode;
use App\Services\PaymentGatewayFactory;
use App\Services\CurrencyService;
use App\Services\WebhookService;
use App\Services\EmailService;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Exception\ApiErrorException;

class PaymentController
{
    public function createIntent(): array
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Validate required fields
            if (empty($data['items']) || empty($data['formData'])) {
                http_response_code(400);
                return ['error' => 'Missing required fields: items and formData are required'];
            }

            $shipping = Order::shippingFromRequest($data['formData']);
            $shippingError = Order::validateShippingData($shipping);
            if ($shippingError !== null) {
                http_response_code(400);
                return ['error' => $shippingError];
            }
        
        // Calculate totals
        $currency = $data['currency'] ?? 'PKR';
        $currencyService = new CurrencyService();
        $fxRate = $currency !== 'PKR' ? $currencyService->getRate('PKR', $currency) : 1.0;
        
        $subtotal = 0;
        foreach ($data['items'] as $item) {
            $subtotal += ($item['unitPrice'] ?? 0) * ($item['quantity'] ?? 1);
        }
        
        // Apply discount
        $discountAmount = 0;
        if (!empty($data['discountCode'])) {
            $discountCode = DiscountCode::findByCode(strtoupper($data['discountCode']));
            if ($discountCode && DiscountCode::isValid($discountCode)) {
                $discountAmount = DiscountCode::calculateDiscount($discountCode, $subtotal);
            }
        }
        
        // Calculate VAT
        $vatRate = floatval($_ENV['UAE_VAT_RATE'] ?? 0.05);
        $taxableAmount = $subtotal - $discountAmount;
        $vatAmount = $taxableAmount * $vatRate;
        $totalAmount = $taxableAmount + $vatAmount;
        
        // Create order first
        $order = Order::create(array_merge([
            'guest_name' => $data['formData']['guest_name'],
            'guest_email' => $data['formData']['guest_email'],
            'guest_phone' => $data['formData']['guest_phone'],
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'discount_code_id' => $discountCode['id'] ?? null,
            'vat_amount' => $vatAmount,
            'total_amount' => $totalAmount,
            'currency' => $currency,
            'fx_rate' => $fxRate,
            'payment_method' => 'stripe',
            'no_refund_accepted' => true,
        ], $shipping));
        
        // Create order items
        foreach ($data['items'] as $item) {
            Order::createItem([
                'order_id' => $order['id'],
                'product_id' => $item['product']['id'],
                'variant_id' => isset($item['variant']['id']) ? $item['variant']['id'] : null,
                'quantity' => $item['quantity'],
                'unit_price' => $item['unitPrice'],
                'total_price' => $item['unitPrice'] * $item['quantity'],
            ]);
        }
        
            // Create Stripe Payment Intent
            // IMPORTANT: Prefer database key to match frontend publishable key from database.
            // Frontend now uses keys from database, so backend should too.
            // Only use env key as fallback if database key is not available.
            $stripeGateway = \App\Models\PaymentGateway::findAnyByType('stripe');
            $dbStripeKey = $stripeGateway['api_secret'] ?? '';
            $envStripeKey = $_ENV['STRIPE_SECRET_KEY'] ?? '';
            // Prioritize database key (matches frontend), fallback to env if database is empty
            $stripeKey = !empty($dbStripeKey) ? $dbStripeKey : $envStripeKey;
            
            // Log which key source is being used for debugging
            if (!empty($dbStripeKey)) {
                $keyType = strpos($dbStripeKey, 'sk_live_') === 0 ? 'LIVE' : (strpos($dbStripeKey, 'sk_test_') === 0 ? 'TEST' : 'UNKNOWN');
                error_log("Stripe Payment Intent: Using database key (${keyType} mode)");
            } elseif (!empty($envStripeKey)) {
                $keyType = strpos($envStripeKey, 'sk_live_') === 0 ? 'LIVE' : (strpos($envStripeKey, 'sk_test_') === 0 ? 'TEST' : 'UNKNOWN');
                error_log("Stripe Payment Intent: Using environment variable key (${keyType} mode) - WARNING: Frontend uses database key!");
            }

            if (empty($stripeKey)) {
                // If Stripe is not configured, return a mock response for testing
                // In production, this should return an error
                return [
                    'client_secret' => 'mock_client_secret_for_testing',
                    'order_id' => $order['id'],
                    'order_number' => $order['order_number'],
                    'warning' => 'Stripe API key not configured - using mock response',
                    'mock' => true
                ];
            }
            
            Stripe::setApiKey($stripeKey);
            
            $amountCents = intval($totalAmount * 100);
            
            if ($amountCents <= 0) {
                http_response_code(400);
                return ['error' => 'Invalid amount'];
            }
            
            $intent = PaymentIntent::create([
                'amount' => $amountCents,
                'currency' => strtolower($currency),
                'metadata' => [
                    'order_number' => $order['order_number'],
                    'order_id' => (string)$order['id'],
                ],
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
            ]);
            
            return [
                'client_secret' => $intent->client_secret,
                'order_id' => $order['id'],
                'order_number' => $order['order_number'],
            ];
        } catch (ApiErrorException $e) {
            http_response_code(400);
            return ['error' => $e->getMessage()];
        } catch (\Exception $e) {
            error_log("Payment createIntent error: " . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Internal server error: ' . $e->getMessage()];
        }
    }
    
    public function confirmPayment(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['payment_intent_id'])) {
            http_response_code(400);
            return ['error' => 'Payment intent ID required'];
        }
        
        try {
            // Use same key priority as createIntent: database first, then env
            $stripeGateway = \App\Models\PaymentGateway::findAnyByType('stripe');
            $dbStripeKey = $stripeGateway['api_secret'] ?? '';
            $envStripeKey = $_ENV['STRIPE_SECRET_KEY'] ?? '';
            $stripeKey = !empty($dbStripeKey) ? $dbStripeKey : $envStripeKey;
            Stripe::setApiKey($stripeKey);
            $intent = PaymentIntent::retrieve($data['payment_intent_id']);
            
            if ($intent->status === 'succeeded') {
                // Get order from metadata
                $orderId = $intent->metadata->order_id ?? null;
                
                if ($orderId) {
                    // Update order status
                    Order::updateStatus($orderId, 'paid', 'completed');
                    
                    // Create payment record
                    \App\Models\Payment::create([
                        'order_id' => $orderId,
                        'gateway' => 'stripe',
                        'transaction_id' => $intent->id,
                        'amount' => $intent->amount / 100,
                        'currency' => strtoupper($intent->currency),
                        'status' => 'completed',
                        'gateway_response' => json_encode($intent->toArray()),
                    ]);
                    
                    $order = Order::find($orderId);
                    
                    if ($order) {
                        // Send email notifications
                        try {
                            EmailService::sendOrderConfirmation($order);
                        } catch (\Exception $e) {
                            error_log('Failed to send order confirmation email: ' . $e->getMessage());
                        }
                        
                        try {
                            EmailService::sendAdminNotification($order);
                        } catch (\Exception $e) {
                            error_log('Failed to send admin notification email: ' . $e->getMessage());
                        }
                        
                        // Trigger player onboarding hook
                        \App\Services\PlayerOnboardingService::sendOnboardingData($order);
                    }
                    
                    return $order ?: ['error' => 'Order not found'];
                }
            }
            
            return ['error' => 'Payment not completed'];
        } catch (ApiErrorException $e) {
            http_response_code(400);
            return ['error' => $e->getMessage()];
        }
    }
    
    /**
     * Handle Stripe webhook
     * POST /api/webhooks/stripe
     */
    public function stripeWebhook(): array
    {
        try {
            $payload = file_get_contents('php://input');
            $signature = WebhookService::getStripeSignature();
            $secret = $_ENV['STRIPE_WEBHOOK_SECRET'] ?? '';
            
            // ALWAYS require signature verification - reject if no signature or secret
            if (empty($signature)) {
                error_log('Stripe webhook: No signature header provided');
                http_response_code(401);
                return ['error' => 'Webhook signature required'];
            }
            
            if (empty($secret)) {
                error_log('Stripe webhook: Webhook secret not configured');
                http_response_code(401);
                return ['error' => 'Webhook not configured'];
            }
            
            // Verify webhook signature
            if (!WebhookService::verifyStripeSignature($payload, $signature, $secret)) {
                error_log('Stripe webhook signature verification failed');
                http_response_code(401);
                return ['error' => 'Invalid webhook signature'];
            }
            
            $data = json_decode($payload, true);
            $eventType = $data['type'] ?? 'unknown';
            
            // Handle different event types
            if ($eventType === 'payment_intent.succeeded') {
                $paymentIntent = $data['data']['object'] ?? null;
                if ($paymentIntent && isset($paymentIntent['metadata']['order_id'])) {
                    $orderId = (int)$paymentIntent['metadata']['order_id'];
                    
                    // Update order status
                    Order::updateStatus($orderId, 'paid', 'completed');
                    
                    // Create or update payment record
                    $existingPayment = \App\Models\Payment::findByTransactionId($paymentIntent['id']);
                    if (!$existingPayment) {
                        \App\Models\Payment::create([
                            'order_id' => $orderId,
                            'gateway' => 'stripe',
                            'transaction_id' => $paymentIntent['id'],
                            'amount' => $paymentIntent['amount'] / 100,
                            'currency' => strtoupper($paymentIntent['currency']),
                            'status' => 'completed',
                            'gateway_response' => json_encode($paymentIntent),
                        ]);
                    }
                    
                    // Trigger player onboarding
                    $order = Order::find($orderId);
                    if ($order) {
                        \App\Services\PlayerOnboardingService::sendOnboardingData($order);
                    }
                }
            } elseif ($eventType === 'payment_intent.payment_failed') {
                $paymentIntent = $data['data']['object'] ?? null;
                if ($paymentIntent && isset($paymentIntent['metadata']['order_id'])) {
                    $orderId = (int)$paymentIntent['metadata']['order_id'];
                    Order::updateStatus($orderId, 'pending', 'failed');
                }
            }
            
            return [
                'success' => true,
                'message' => 'Webhook processed',
                'type' => $eventType
            ];
        } catch (\Exception $e) {
            error_log('Stripe webhook processing error: ' . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Webhook processing failed: ' . $e->getMessage()];
        }
    }
    
    /**
     * Handle Tabby webhook
     * POST /api/webhooks/tabby
     */
    public function tabbyWebhook(): array
    {
        try {
            $payload = file_get_contents('php://input');
            $signature = WebhookService::getTabbySignature();
            $secret = $_ENV['TABBY_WEBHOOK_SECRET'] ?? '';
            
            // ALWAYS require signature verification - reject if no signature or secret
            if (empty($signature)) {
                error_log('Tabby webhook: No signature header provided');
                http_response_code(401);
                return ['error' => 'Webhook signature required'];
            }
            
            if (empty($secret)) {
                error_log('Tabby webhook: Webhook secret not configured');
                http_response_code(401);
                return ['error' => 'Webhook not configured'];
            }
            
            // Verify webhook signature
            if (!WebhookService::verifyTabbySignature($payload, $signature, $secret)) {
                error_log('Tabby webhook signature verification failed');
                http_response_code(401);
                return ['error' => 'Invalid webhook signature'];
            }
            
            $data = json_decode($payload, true);
            $eventType = $data['type'] ?? $data['status'] ?? 'unknown';
            
            // Handle Tabby payment status updates
            // Tabby webhook can send payment data in different formats:
            // 1. Direct payment object: { id: "payment_id", status: "authorized", order: { reference_id: "ORDER_NUMBER" } }
            // 2. Payment in payload: { type: "payment", payload: { id: "payment_id", status: "authorized", order: { reference_id: "ORDER_NUMBER" } } }
            
            $paymentId = null;
            $orderNumber = null;
            $paymentStatus = null;
            
            // Extract payment ID
            if (isset($data['id'])) {
                $paymentId = $data['id'];
            } elseif (isset($data['payload']['id'])) {
                $paymentId = $data['payload']['id'];
            }
            
            // Extract order reference (order_number)
            if (isset($data['order']['reference_id'])) {
                $orderNumber = $data['order']['reference_id'];
            } elseif (isset($data['payload']['order']['reference_id'])) {
                $orderNumber = $data['payload']['order']['reference_id'];
            }
            
            // Extract payment status
            if (isset($data['status'])) {
                $paymentStatus = $data['status'];
            } elseif (isset($data['payload']['status'])) {
                $paymentStatus = $data['payload']['status'];
            }
            
            // Find order by order number (preferred) or by payment transaction ID
            $orderId = null;
            
            if ($orderNumber) {
                $order = Order::findByOrderNumber($orderNumber);
                if ($order) {
                    $orderId = $order['id'];
                }
            }
            
            // Fallback: find by payment transaction ID
            if (!$orderId && $paymentId) {
                $payment = \App\Models\Payment::findByTransactionId($paymentId);
                if ($payment) {
                    $orderId = $payment['order_id'];
                }
            }
            
            if ($orderId && $paymentStatus) {
                // Update order based on Tabby status
                if ($paymentStatus === 'authorized' || $paymentStatus === 'closed' || $paymentStatus === 'approved') {
                    Order::updateStatus($orderId, 'paid', 'completed');
                    
                    // Update payment record
                    if ($paymentId) {
                        \App\Models\Payment::updateStatus($paymentId, 'completed');
                    }
                    
                    // Trigger player onboarding
                    $order = Order::find($orderId);
                    if ($order) {
                        \App\Services\PlayerOnboardingService::sendOnboardingData($order);
                    }
                    
                    error_log("Tabby webhook: Order {$orderId} marked as paid and completed");
                } elseif ($paymentStatus === 'declined' || $paymentStatus === 'expired' || $paymentStatus === 'rejected') {
                    Order::updateStatus($orderId, 'pending', 'failed');
                    if ($paymentId) {
                        \App\Models\Payment::updateStatus($paymentId, 'failed');
                    }
                    error_log("Tabby webhook: Order {$orderId} marked as failed");
                } else {
                    error_log("Tabby webhook: Order {$orderId} status '{$paymentStatus}' - no action taken");
                }
            } else {
                error_log("Tabby webhook: Could not find order. Payment ID: {$paymentId}, Order Number: {$orderNumber}, Status: {$paymentStatus}");
            }
            
            return [
                'success' => true,
                'message' => 'Webhook processed',
                'type' => $eventType
            ];
        } catch (\Exception $e) {
            error_log('Tabby webhook processing error: ' . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Webhook processing failed: ' . $e->getMessage()];
        }
    }

    /**
     * Handle Tamara webhook
     * POST /api/webhooks/tamara
     * Tamara sends order status updates (approved, authorised, etc.)
     */
    public function tamaraWebhook(): array
    {
        try {
            $payload = file_get_contents('php://input');
            $data = json_decode($payload, true);

            if (!$data) {
                error_log('Tamara webhook: Invalid JSON payload');
                http_response_code(400);
                return ['error' => 'Invalid payload'];
            }

            $orderId = $data['order_id'] ?? $data['orderId'] ?? null;
            $status = strtolower($data['status'] ?? '');
            $orderReferenceId = $data['order_reference_id'] ?? $data['order_reference_id'] ?? null;

            if (!$orderId && !$orderReferenceId) {
                error_log('Tamara webhook: Missing order_id or order_reference_id');
                http_response_code(400);
                return ['error' => 'Missing order identifier'];
            }

            // Find order: by Tamara order_id (stored as transaction_id) or by order_reference_id (our order_number)
            $order = null;
            if ($orderReferenceId) {
                $order = Order::findByOrderNumber($orderReferenceId);
            }
            if (!$order && $orderId) {
                $payment = \App\Models\Payment::findByTransactionId($orderId);
                if ($payment) {
                    $order = Order::find($payment['order_id']);
                }
            }

            if (!$order) {
                error_log("Tamara webhook: Order not found. order_id={$orderId}, order_reference_id={$orderReferenceId}");
                http_response_code(404);
                return ['error' => 'Order not found'];
            }

            $orderIdDb = $order['id'];

            if (in_array($status, ['approved', 'authorised', 'authorized', 'fully_captured'])) {
                Order::updateStatus($orderIdDb, 'paid', 'completed');
                $paymentRecord = \App\Models\Payment::findByOrderAndGateway($orderIdDb, 'tamara');
                if ($paymentRecord) {
                    \App\Models\Payment::updateStatus($paymentRecord['transaction_id'], 'completed');
                }
                $updatedOrder = Order::find($orderIdDb);
                if ($updatedOrder) {
                    \App\Services\PlayerOnboardingService::sendOnboardingData($updatedOrder);
                }
                error_log("Tamara webhook: Order {$orderIdDb} marked as paid (status={$status})");
            } elseif (in_array($status, ['declined', 'expired', 'rejected', 'cancelled', 'canceled'])) {
                Order::updateStatus($orderIdDb, 'pending', 'failed');
                $paymentRecord = \App\Models\Payment::findByOrderAndGateway($orderIdDb, 'tamara');
                if ($paymentRecord) {
                    \App\Models\Payment::updateStatus($paymentRecord['transaction_id'], 'failed');
                }
                error_log("Tamara webhook: Order {$orderIdDb} marked as failed (status={$status})");
            } else {
                error_log("Tamara webhook: Order {$orderIdDb} status '{$status}' - no action taken");
            }

            return ['success' => true, 'message' => 'Webhook processed'];
        } catch (\Exception $e) {
            error_log('Tamara webhook error: ' . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Webhook processing failed'];
        }
    }

    /**
     * Handle Network.ae / N-Genius webhook
     * POST /api/webhooks/ngenius
     *
     * In sandbox, webhook URLs may require whitelisting. Payload formats can vary,
     * so we validate status by retrieving the order via API when possible.
     */
    public function ngeniusWebhook(): array
    {
        try {
            // Optional shared-secret header validation (N-Genius webhooks are not signed).
            // If configured in DB, require X-Webhook-Token to match.
            $ngGateway = \App\Models\PaymentGateway::findAnyByType('ngenius') ?? [];
            $expectedToken = trim((string)($ngGateway['webhook_secret'] ?? ''));
            if ($expectedToken !== '') {
                $headers = function_exists('getallheaders') ? getallheaders() : [];
                $provided = $headers['X-Webhook-Token'] ?? $headers['x-webhook-token'] ?? null;
                if (!is_string($provided) || $provided !== $expectedToken) {
                    http_response_code(401);
                    return ['error' => 'Invalid webhook token'];
                }
            }

            $payload = file_get_contents('php://input');
            $data = json_decode($payload, true);

            if (!$data) {
                http_response_code(400);
                return ['error' => 'Invalid payload'];
            }

            $gateway = PaymentGatewayFactory::getGateway('ngenius');
            if (!$gateway) {
                http_response_code(500);
                return ['error' => 'Gateway not configured'];
            }

            $handled = $gateway->handleWebhook($data);
            if (!($handled['processed'] ?? false)) {
                http_response_code(400);
                return ['error' => $handled['error'] ?? 'Webhook not processed'];
            }

            $reference = $handled['reference'] ?? null; // N-Genius order ref (UUID)
            $merchantOrderRef = $handled['merchant_order_reference'] ?? null; // our order number when available

            if ((!is_string($reference) || $reference === '') && (!is_string($merchantOrderRef) || $merchantOrderRef === '')) {
                http_response_code(400);
                return ['error' => 'Missing reference'];
            }

            // Prefer our order number if present
            $order = null;
            if (is_string($merchantOrderRef) && $merchantOrderRef !== '') {
                $order = Order::findByOrderNumber($merchantOrderRef);
            }
            if (!$order) {
                // Fallback: try to locate payment by transaction id
                $payment = \App\Models\Payment::findByTransactionId((string)$reference);
                if ($payment) {
                    $order = Order::find($payment['order_id']);
                }
            }

            if (!$order) {
                http_response_code(404);
                return ['error' => 'Order not found'];
            }

            $status = $handled['status'] ?? 'pending';
            if ($status === 'completed') {
                Order::updateStatus($order['id'], 'paid', 'completed');
                $paymentRecord = \App\Models\Payment::findByOrderAndGateway($order['id'], 'ngenius');
                if ($paymentRecord && !empty($paymentRecord['transaction_id'])) {
                    \App\Models\Payment::updateStatus($paymentRecord['transaction_id'], 'completed');
                }
                $updatedOrder = Order::find($order['id']);
                if ($updatedOrder) {
                    \App\Services\PlayerOnboardingService::sendOnboardingData($updatedOrder);
                }
            } elseif ($status === 'failed') {
                Order::updateStatus($order['id'], 'pending', 'failed');
                $paymentRecord = \App\Models\Payment::findByOrderAndGateway($order['id'], 'ngenius');
                if ($paymentRecord && !empty($paymentRecord['transaction_id'])) {
                    \App\Models\Payment::updateStatus($paymentRecord['transaction_id'], 'failed');
                }
            }

            return ['success' => true, 'message' => 'Webhook processed'];
        } catch (\Exception $e) {
            error_log('N-Genius webhook error: ' . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Webhook processing failed'];
        }
    }

    /**
     * Handle Safepay webhook
     * POST /api/webhooks/safepay
     */
    public function safepayWebhook(): array
    {
        try {
            $payload = file_get_contents('php://input');
            $data = json_decode($payload, true);

            if (!$data) {
                http_response_code(400);
                return ['error' => 'Invalid payload'];
            }

            $gateway = PaymentGatewayFactory::getGateway('safepay');
            if (!$gateway) {
                http_response_code(500);
                return ['error' => 'Gateway not configured'];
            }

            $handled = $gateway->handleWebhook($data);
            if (!($handled['processed'] ?? false)) {
                http_response_code(400);
                return ['error' => $handled['error'] ?? 'Webhook not processed'];
            }

            $reference = $handled['reference'] ?? null;
            $merchantOrderRef = $handled['merchant_order_reference'] ?? null;

            $order = null;
            if (is_string($merchantOrderRef) && $merchantOrderRef !== '') {
                $order = Order::findByOrderNumber($merchantOrderRef);
            }
            if (!$order && is_string($reference) && $reference !== '') {
                $payment = \App\Models\Payment::findByTransactionId($reference);
                if ($payment) {
                    $order = Order::find($payment['order_id']);
                }
            }

            if (!$order) {
                http_response_code(404);
                return ['error' => 'Order not found'];
            }

            $status = $handled['status'] ?? 'pending';
            if ($status === 'completed') {
                Order::updateStatus($order['id'], 'paid', 'completed');
                $paymentRecord = \App\Models\Payment::findByOrderAndGateway($order['id'], 'safepay');
                if ($paymentRecord && !empty($paymentRecord['transaction_id'])) {
                    \App\Models\Payment::updateStatus($paymentRecord['transaction_id'], 'completed');
                }
                $updatedOrder = Order::find($order['id']);
                if ($updatedOrder) {
                    \App\Services\PlayerOnboardingService::sendOnboardingData($updatedOrder);
                }
            } elseif ($status === 'failed') {
                Order::updateStatus($order['id'], 'pending', 'failed');
                $paymentRecord = \App\Models\Payment::findByOrderAndGateway($order['id'], 'safepay');
                if ($paymentRecord && !empty($paymentRecord['transaction_id'])) {
                    \App\Models\Payment::updateStatus($paymentRecord['transaction_id'], 'failed');
                }
            }

            return ['success' => true, 'message' => 'Webhook processed'];
        } catch (\Exception $e) {
            error_log('Safepay webhook error: ' . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Webhook processing failed'];
        }
    }
}
