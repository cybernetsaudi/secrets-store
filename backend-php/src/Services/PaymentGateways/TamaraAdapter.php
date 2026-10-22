<?php

namespace App\Services\PaymentGateways;

use App\Services\PaymentGatewayInterface;
use App\Models\PaymentGateway;

/**
 * Tamara BNPL Payment Gateway Adapter
 * Uses Tamara API: https://api.tamara.co (production) or https://api-sandbox.tamara.co (sandbox)
 * Credentials stored in payment_gateways table - never hardcoded.
 */
class TamaraAdapter implements PaymentGatewayInterface
{
    private ?array $gatewayConfig = null;

    public function __construct()
    {
        $this->gatewayConfig = PaymentGateway::findAnyByType('tamara');
    }

    private function getApiToken(): string
    {
        return $this->gatewayConfig['api_secret'] ?? '';
    }

    private function getApiUrl(): string
    {
        $isTestMode = $this->gatewayConfig['is_test_mode'] ?? true;
        return $isTestMode ? 'https://api-sandbox.tamara.co' : 'https://api.tamara.co';
    }

    private function getMerchantId(): string
    {
        return $this->gatewayConfig['merchant_id'] ?? '';
    }

    public function processPayment(array $order, array $paymentData, float $amount, string $currency): array
    {
        $apiToken = $this->getApiToken();
        if (empty($apiToken)) {
            return [
                'success' => false,
                'error' => 'Tamara API token not configured. Please configure Tamara in Payment Gateways settings.',
            ];
        }

        $merchantId = $this->getMerchantId();
        if (empty($merchantId)) {
            return [
                'success' => false,
                'error' => 'Tamara Merchant ID not configured. Please configure in Payment Gateways settings.',
            ];
        }

        $apiUrl = $this->getApiUrl();
        $orderNumber = $order['order_number'] ?? '';
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://secrets.gatvia.com';

        // Split guest name into first/last for Tamara consumer
        $fullName = $order['guest_name'] ?? 'Customer';
        $parts = preg_split('/\s+/', trim($fullName), 2);
        $firstName = $parts[0] ?? 'Customer';
        $lastName = $parts[1] ?? '';

        // Build order items for Tamara
        $orderItems = [];
        if (isset($order['items']) && is_array($order['items'])) {
            foreach ($order['items'] as $idx => $item) {
                $itemName = $item['product_name'] ?? 'Product';
                if (isset($item['variant_name']) && !empty($item['variant_name'])) {
                    $itemName .= ' - ' . $item['variant_name'];
                }
                $unitPrice = (float)($item['unit_price'] ?? 0);
                $qty = (int)($item['quantity'] ?? 1);
                $itemTotal = $unitPrice * $qty;

                $orderItems[] = [
                    'name' => substr($itemName, 0, 255),
                    'type' => 'Physical',
                    'reference_id' => (string)($item['product_id'] ?? $idx),
                    'sku' => 'SKU-' . ($item['product_id'] ?? $idx),
                    'quantity' => $qty,
                    'unit_price' => ['amount' => round($unitPrice, 2), 'currency' => $currency],
                    'total_amount' => ['amount' => (string)round($itemTotal, 2), 'currency' => $currency],
                ];
            }
        }

        if (empty($orderItems)) {
            $orderItems[] = [
                'name' => 'Order ' . $orderNumber,
                'type' => 'Physical',
                'reference_id' => $orderNumber,
                'sku' => 'ORDER-' . $orderNumber,
                'quantity' => 1,
                'unit_price' => ['amount' => round($amount, 2), 'currency' => $currency],
                'total_amount' => ['amount' => (string)round($amount, 2), 'currency' => $currency],
            ];
        }

        $vatAmount = (float)($order['vat_amount'] ?? 0);
        $countryCode = 'AE';

        $requestBody = [
            'order_reference_id' => $orderNumber,
            'order_number' => $orderNumber,
            'total_amount' => ['amount' => round($amount, 2), 'currency' => $currency],
            'shipping_amount' => ['amount' => '0', 'currency' => $currency],
            'tax_amount' => ['amount' => (string)round($vatAmount, 2), 'currency' => $currency],
            'description' => 'Order ' . $orderNumber,
            'country_code' => $countryCode,
            'payment_type' => 'PAY_BY_INSTALMENTS',
            'instalments' => 4,
            'items' => $orderItems,
            'consumer' => [
                'first_name' => substr($firstName, 0, 255),
                'last_name' => substr($lastName, 0, 255),
                'phone_number' => $order['guest_phone'] ?? '',
                'email' => $order['guest_email'] ?? '',
            ],
            'shipping_address' => [
                'first_name' => substr($firstName, 0, 255),
                'last_name' => substr($lastName, 0, 255),
                'line1' => 'Dubai',
                'city' => 'Dubai',
                'country_code' => $countryCode,
            ],
            'merchant_url' => [
                'success' => "{$baseUrl}/success/?order={$orderNumber}",
                'failure' => "{$baseUrl}/success/?order={$orderNumber}&status=failed",
                'cancel' => "{$baseUrl}/success/?order={$orderNumber}&status=cancelled",
            ],
            'locale' => 'en_US',
            'platform' => 'GATVIA Secrets',
        ];

        if (!empty($order['shipping_address'])) {
            $requestBody['shipping_address']['line1'] = substr($order['shipping_address'], 0, 255);
        }
        if (!empty($order['shipping_city'])) {
            $requestBody['shipping_address']['city'] = $order['shipping_city'];
        }

        $ch = curl_init("{$apiUrl}/checkout");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$apiToken}",
            "Content-Type: application/json",
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return [
                'success' => false,
                'error' => "Tamara API connection error: {$curlError}",
                'gateway_response' => [],
            ];
        }

        $data = $response ? json_decode($response, true) : null;

        if ($httpCode >= 200 && $httpCode < 300 && $data) {
            $checkoutUrl = $data['checkout_url'] ?? null;
            $orderId = $data['order_id'] ?? null;
            $checkoutId = $data['checkout_id'] ?? null;

            if ($checkoutUrl && ($orderId || $checkoutId)) {
                $transactionId = $orderId ?: $checkoutId;
                return [
                    'success' => true,
                    'transaction_id' => $transactionId,
                    'payment_id' => $orderId,
                    'session_id' => $checkoutId,
                    'checkout_url' => $checkoutUrl,
                    'status' => 'pending',
                    'gateway_response' => $data,
                ];
            }
        }

        $errorMessage = 'Tamara API error';
        if ($data) {
            if (isset($data['message'])) {
                $errorMessage = $data['message'];
            } elseif (isset($data['error'])) {
                $errorMessage = is_string($data['error']) ? $data['error'] : json_encode($data['error']);
            } elseif (isset($data['errors']) && is_array($data['errors'])) {
                $msgs = [];
                foreach ($data['errors'] as $e) {
                    $msgs[] = is_array($e) ? ($e['message'] ?? json_encode($e)) : (string)$e;
                }
                $errorMessage = implode(', ', $msgs);
            }
        }

        return [
            'success' => false,
            'error' => $errorMessage,
            'gateway_response' => $data ?? ['raw' => substr($response ?? '', 0, 500)],
            'http_code' => $httpCode,
        ];
    }

    public function verifyPayment(string $transactionId): array
    {
        $apiToken = $this->getApiToken();
        if (empty($apiToken)) {
            return ['status' => 'failed', 'error' => 'API token not configured'];
        }

        $apiUrl = $this->getApiUrl();
        // Tamara API: GET /orders/{order_id} (not /merchants/orders/...)
        $url = "{$apiUrl}/orders/{$transactionId}";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$apiToken}",
            "Content-Type: application/json",
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            return ['status' => 'pending', 'error' => "HTTP {$httpCode} - Unable to verify"];
        }

        $data = json_decode($response, true);
        if (!$data || !isset($data['status'])) {
            return ['status' => 'pending', 'error' => 'Invalid response'];
        }

        $status = strtolower($data['status'] ?? '');
        $statusMap = [
            'approved' => 'completed',
            'authorised' => 'completed',
            'authorized' => 'completed',
            'fully_captured' => 'completed',
            'partially_captured' => 'completed',
            'new' => 'pending',
            'pending' => 'pending',
            'declined' => 'failed',
            'canceled' => 'failed',
            'cancelled' => 'failed',
            'expired' => 'failed',
            'updated' => 'pending',
        ];

        $mapped = $statusMap[$status] ?? 'pending';

        return [
            'status' => $mapped,
            'gateway_response' => $data,
            'payment_id' => $data['order_id'] ?? $transactionId,
        ];
    }

    public function handleWebhook(array $data): array
    {
        $notificationToken = $this->gatewayConfig['webhook_secret'] ?? '';
        if (!empty($notificationToken)) {
            // Tamara sends tamaraToken in query or Authorization header - verify if present
            // For now we accept the webhook and process status updates
        }

        if (isset($data['order_id']) && isset($data['status'])) {
            return [
                'processed' => true,
                'transaction_id' => $data['order_id'],
                'status' => $data['status'],
            ];
        }

        return ['processed' => false, 'error' => 'Invalid webhook data'];
    }
}
