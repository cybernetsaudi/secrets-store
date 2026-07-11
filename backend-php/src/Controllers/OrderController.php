<?php

namespace App\Controllers;

use App\Models\Order;
use App\Models\DiscountCode;
use App\Services\PaymentGatewayFactory;
use App\Services\CurrencyService;
use App\Services\EmailService;
use App\Core\Database;

class OrderController
{
    public function checkout(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $required = ['guest_name', 'guest_email', 'guest_phone', 'items', 'payment_method'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                http_response_code(400);
                return ['error' => "Missing required field: {$field}"];
            }
        }
        
        if (!($data['no_refund_accepted'] ?? false)) {
            http_response_code(400);
            return ['error' => 'No refund policy must be accepted'];
        }
        
        // Calculate totals
        $currency = $data['currency'] ?? 'AED';
        $currencyService = new CurrencyService();
        $fxRate = $currency !== 'AED' ? $currencyService->getRate('AED', $currency) : 1.0;
        
        $subtotal = 0;
        $items = [];
        
        foreach ($data['items'] as $itemData) {
            $product = \App\Models\Product::find(intval($itemData['product_id']));
            if (!$product || !($product['is_active'] ?? false)) {
                http_response_code(404);
                return ['error' => "Product not found: {$itemData['product_id']}"];
            }
            
            $variant = null;
            $unitPrice = floatval($product['base_price']);
            
            if (!empty($itemData['variant_id'])) {
                $variant = \App\Models\ProductVariant::find($itemData['variant_id']);
                if ($variant) {
                    $unitPrice += floatval($variant['price_modifier']);
                }
            }
            
            if ($currency !== $product['currency']) {
                $unitPrice = $unitPrice * $fxRate;
            }
            
            $quantity = intval($itemData['quantity'] ?? 1);
            $itemTotal = $unitPrice * $quantity;
            $subtotal += $itemTotal;
            
            $items[] = [
                'product' => $product,
                'variant' => $variant,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
            ];
        }
        
        // Apply discount
        $discountCode = null;
        $discountAmount = 0;
        if (!empty($data['discount_code'])) {
            $discountCode = DiscountCode::findByCode(strtoupper($data['discount_code']));
            if ($discountCode && DiscountCode::isValid($discountCode)) {
                $discountAmount = DiscountCode::calculateDiscount($discountCode, $subtotal);
                if ($discountAmount > 0) {
                    DiscountCode::incrementUsage($discountCode['id']);
                }
            }
        }
        
        // Calculate VAT
        $vatRate = floatval($_ENV['UAE_VAT_RATE'] ?? 0.05);
        $taxableAmount = $subtotal - $discountAmount;
        $vatAmount = $taxableAmount * $vatRate;
        $totalAmount = $taxableAmount + $vatAmount;
        
        // Create order
        $order = Order::create([
            'guest_name' => $data['guest_name'],
            'guest_email' => $data['guest_email'],
            'guest_phone' => $data['guest_phone'],
            'player_name' => $data['player_name'] ?? null,
            'player_date_of_birth' => $data['player_date_of_birth'] ?? null,
            'trial_coach_name' => $data['trial_coach_name'] ?? null,
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'discount_code_id' => $discountCode['id'] ?? null,
            'vat_amount' => $vatAmount,
            'total_amount' => $totalAmount,
            'currency' => $currency,
            'fx_rate' => $fxRate,
            'payment_method' => $data['payment_method'],
            'bank_account_id' => $data['bank_account_id'] ?? null, // Store selected bank account
            'no_refund_accepted' => true,
        ]);
        
        // Create order items
        $unavailableProducts = [];
        foreach ($items as $item) {
            try {
                // Double-check product still exists before creating order item
                $productCheck = \App\Models\Product::find(intval($item['product']['id']));
                if (!$productCheck || !($productCheck['is_active'] ?? false)) {
                    $unavailableProducts[] = [
                        'product_id' => $item['product']['id'],
                        'product_name' => $item['product']['name'] ?? 'Unknown Product',
                    ];
                    continue;
                }
                
                Order::createItem([
                    'order_id' => $order['id'],
                    'product_id' => $item['product']['id'],
                    'variant_id' => $item['variant']['id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['unit_price'] * $item['quantity'],
                ]);
            } catch (\Exception $e) {
                // Check if it's a foreign key constraint violation
                $errorCode = $e->getCode();
                $errorMessage = $e->getMessage();
                
                // MySQL error code 1452 = Foreign key constraint fails
                // PDO error code 23000 = Integrity constraint violation
                if (strpos($errorMessage, '1452') !== false || 
                    strpos($errorMessage, '23000') !== false ||
                    strpos($errorMessage, 'foreign key') !== false ||
                    strpos($errorMessage, 'FOREIGN KEY') !== false) {
                    $unavailableProducts[] = [
                        'product_id' => $item['product']['id'],
                        'product_name' => $item['product']['name'] ?? 'Unknown Product',
                    ];
                } else {
                    // Re-throw if it's a different error
                    throw $e;
                }
            }
        }
        
        // If any products are unavailable, delete the order and return error
        // Only delete if order is still pending/incomplete (not paid/completed)
        if (!empty($unavailableProducts)) {
            // Only delete the order if it's still pending/incomplete
            // Never delete completed or paid orders for audit purposes
            $orderStatus = $order['status'] ?? 'pending';
            $paymentStatus = $order['payment_status'] ?? 'pending';
            
            $isCompleted = in_array($orderStatus, ['paid', 'completed']) || 
                          in_array($paymentStatus, ['completed', 'paid']);
            
            if (!$isCompleted) {
                // Safe to delete - order is still pending/incomplete
                try {
                    Database::query("DELETE FROM orders WHERE id = ?", [$order['id']]);
                } catch (\Exception $e) {
                    // Log but don't fail
                    error_log('Failed to delete incomplete order: ' . $e->getMessage());
                }
            } else {
                // Order is completed/paid - don't delete, but log the issue
                error_log(
                    "Warning: Unavailable products detected in completed order #{$order['id']} " .
                    "(Order Number: {$order['order_number']}). Order preserved for audit purposes."
                );
            }
            
            $productNames = array_map(function($p) { return $p['product_name']; }, $unavailableProducts);
            $productIds = array_map(function($p) { return $p['product_id']; }, $unavailableProducts);
            
            http_response_code(400);
            return [
                'error' => 'Some products in your cart are no longer available and have been removed by the store administrator.',
                'error_code' => 'PRODUCTS_UNAVAILABLE',
                'unavailable_products' => $unavailableProducts,
                'message' => 'The following products are no longer available: ' . implode(', ', $productNames) . '. Please remove them from your cart and try again.',
            ];
        }
        
        // Reload order with items for payment processing (Tabby requires order items)
        $orderWithItems = Order::find($order['id']);
        if (!$orderWithItems) {
            http_response_code(500);
            return ['error' => 'Failed to load order details'];
        }
        
        // Process payment
        $gateway = PaymentGatewayFactory::getGateway($data['payment_method']);
        if (!$gateway) {
            http_response_code(400);
            return ['error' => 'Invalid payment method'];
        }
        
        $paymentResult = $gateway->processPayment($orderWithItems, $data['payment_data'] ?? [], $totalAmount, $currency);
        
        // For Tabby rejections, we still need to create a payment record to store rejection info
        // This allows us to display rejection reasons in the admin panel
        $shouldCreatePaymentRecord = false;
        $paymentStatus = 'pending';
        
        if (!$paymentResult['success']) {
            // IMPORTANT: For Tabby/Tamara (BNPL), if a checkout URL exists, we should ALWAYS redirect
            // Even if the gateway returns an error status, if they provide a checkout URL, let them handle verification
            if (in_array($data['payment_method'], ['tabby', 'tamara', 'ngenius']) && !empty($paymentResult['checkout_url'])) {
                // Tabby provided a checkout URL - allow redirect even if success=false
                // This lets Tabby handle verification and rejection on their website
                error_log("OrderController: Tabby returned checkout URL despite error - allowing redirect for order {$order['id']}");
                $shouldCreatePaymentRecord = true;
                $paymentStatus = 'pending';
            } elseif ($data['payment_method'] === 'tabby' && isset($paymentResult['rejection_code'])) {
                // Tabby rejected and no checkout URL - create payment record with 'failed' status
                $shouldCreatePaymentRecord = true;
                $paymentStatus = 'failed';
                error_log("OrderController: Tabby payment rejected for order {$order['id']} - creating payment record with rejection info");
            } else {
                // For other payment methods or non-rejection failures, return error without creating payment
                http_response_code(400);
                return [
                    'error' => $paymentResult['error'] ?? 'Payment processing failed',
                    'order_id' => $order['id'],
                    'order_number' => $order['order_number'],
                    'requires_action' => $paymentResult['requires_action'] ?? false,
                    'client_secret' => $paymentResult['client_secret'] ?? null,
                ];
            }
        } else {
            $shouldCreatePaymentRecord = true;
            // Redirect-based / async confirmation methods stay pending until webhook/verification updates.
            $paymentStatus = in_array($data['payment_method'], ['bank_transfer', 'tabby', 'tamara', 'ngenius']) ? 'pending' : 'completed';
        }
        
        // Create payment record (for both successful and rejected Tabby payments)
        if ($shouldCreatePaymentRecord) {
            // For Tabby/Tamara, store payment_id if available (for verification), otherwise use session_id
            $transactionId = $paymentResult['transaction_id'] ?? null;
            if (in_array($data['payment_method'], ['tabby', 'tamara']) && isset($paymentResult['payment_id'])) {
                // Prefer payment_id for Tabby verification
                $transactionId = $paymentResult['payment_id'];
                error_log("OrderController: Storing Tabby payment_id: {$transactionId} for order {$order['id']}");
            } elseif (in_array($data['payment_method'], ['tabby', 'tamara']) && !$paymentResult['success']) {
                // For rejected Tabby payments, use order number as transaction_id if no session ID
                $transactionId = $transactionId ?: 'rejected-' . $order['order_number'];
            }
            
            \App\Models\Payment::create([
                'order_id' => $order['id'],
                'gateway' => $data['payment_method'],
                'transaction_id' => $transactionId,
                'amount' => $totalAmount,
                'currency' => $currency,
                'status' => $paymentStatus,
                'gateway_response' => json_encode($paymentResult['gateway_response'] ?? []),
            ]);
            
            // If Tabby/Tamara rejected AND no checkout URL, update order status and return error
            // If Tabby provided a checkout URL, we'll redirect (handled below)
            if (in_array($data['payment_method'], ['tabby', 'tamara']) && !$paymentResult['success'] && empty($paymentResult['checkout_url'])) {
                Order::updateStatus($order['id'], 'pending', 'failed');
                http_response_code(400);
                return [
                    'error' => $paymentResult['error'] ?? 'Payment processing failed',
                    'order_id' => $order['id'],
                    'order_number' => $order['order_number'],
                    'requires_action' => $paymentResult['requires_action'] ?? false,
                    'client_secret' => $paymentResult['client_secret'] ?? null,
                ];
            }
        }
        
        // Update order status
        if ($paymentResult['status'] === 'completed') {
            Order::updateStatus($order['id'], 'paid', 'completed');
            
            // Send email notifications
            $completedOrder = Order::find($order['id']);
            if ($completedOrder) {
                // Send order confirmation to customer
                try {
                    EmailService::sendOrderConfirmation($completedOrder);
                } catch (\Exception $e) {
                    error_log('Failed to send order confirmation email: ' . $e->getMessage());
                }
                
                // Send admin notification
                try {
                    EmailService::sendAdminNotification($completedOrder);
                } catch (\Exception $e) {
                    error_log('Failed to send admin notification email: ' . $e->getMessage());
                }
                
                // Trigger player onboarding hook
                \App\Services\PlayerOnboardingService::sendOnboardingData($completedOrder);
            }
        } elseif ($data['payment_method'] === 'bank_transfer') {
            // For bank transfer, payment is pending but we should notify admin
            $pendingOrder = Order::find($order['id']);
            if ($pendingOrder) {
                try {
                    EmailService::sendAdminNotification($pendingOrder);
                } catch (\Exception $e) {
                    error_log('Failed to send admin notification email for bank transfer order: ' . $e->getMessage());
                }
            }
        }
        
        $response = Order::find($order['id']);
        if (isset($paymentResult['checkout_url'])) {
            $response['checkout_url'] = $paymentResult['checkout_url'];
        }
        
        return $response;
    }
    
    /**
     * Get order by order number (public endpoint for success page)
     * GET /api/orders/by-number/{orderNumber}
     * Also verifies Tabby payment status if payment is still pending
     */
    public function getByOrderNumber(string $orderNumber): array
    {
        $order = Order::findByOrderNumber($orderNumber);
        
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }
        
        // If BNPL / redirect payment is still pending, verify with gateway API
        $order = \App\Services\RedirectPaymentVerifier::verifyOrderIfPending($order);
        
        // Only return basic order info (no sensitive data)
        return [
            'id' => $order['id'],
            'order_number' => $order['order_number'],
            'status' => $order['status'],
            'payment_status' => $order['payment_status'],
            'payment_method' => $order['payment_method'],
            'total_amount' => $order['total_amount'],
            'currency' => $order['currency'],
            'created_at' => $order['created_at'],
        ];
    }
}

