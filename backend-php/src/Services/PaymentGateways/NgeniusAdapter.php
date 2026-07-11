<?php

namespace App\Services\PaymentGateways;

use App\Services\PaymentGatewayInterface;
use App\Models\PaymentGateway;

/**
 * Network.ae / N-Genius Online (Hosted Payment Page redirect integration)
 *
 * Design goals:
 * - Additive gateway (does not affect existing Stripe/Tabby/Tamara flows)
 * - Server-side API key only (never exposed to frontend)
 * - Use SALE flow (authorize+capture) by default
 */
class NgeniusAdapter implements PaymentGatewayInterface
{
    private array $gatewayConfig;

    public function __construct()
    {
        $this->gatewayConfig = PaymentGateway::findAnyByType('ngenius') ?? [];
    }

    private function isTestMode(): bool
    {
        return !empty($this->gatewayConfig['is_test_mode']);
    }

    private function getApiKey(): string
    {
        return trim((string)($this->gatewayConfig['api_key'] ?? ''));
    }

    private function getOutletId(): string
    {
        return trim((string)($this->gatewayConfig['merchant_id'] ?? ''));
    }

    private function getBaseUrl(): string
    {
        // Standard N-Genius gateways (UAE). Sandbox uses api-gateway.sandbox...
        return $this->isTestMode()
            ? 'https://api-gateway.sandbox.ngenius-payments.com'
            : 'https://api-gateway.ngenius-payments.com';
    }

    private function request(
        string $method,
        string $url,
        array $headers = [],
        ?array $jsonBody = null,
        ?string $contentType = null,
        ?string $accept = null
    ): array
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        // Hostinger egress over IPv6 is blocked by Network.ae / Akamai WAF; force IPv4.
        if (defined('CURL_IPRESOLVE_V4')) {
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        }

        $finalHeaders = $headers;
        $acceptHeader = $accept ?: 'application/vnd.ni-payment.v2+json';
        if ($jsonBody !== null) {
            $payload = json_encode($jsonBody);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            $finalHeaders[] = 'Content-Type: ' . ($contentType ?: 'application/vnd.ni-payment.v2+json');
            $finalHeaders[] = 'Accept: ' . $acceptHeader;
        } else {
            $finalHeaders[] = 'Accept: ' . $acceptHeader;
        }

        curl_setopt($ch, CURLOPT_HTTPHEADER, $finalHeaders);

        $raw = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            return ['_http_code' => 0, 'error' => $err];
        }

        $data = json_decode((string)$raw, true);
        if (!is_array($data)) $data = [];
        $data['_http_code'] = $httpCode;
        $data['_raw_body'] = (string)$raw;
        return $data;
    }

    private function getAccessToken(): ?string
    {
        $apiKey = $this->getApiKey();
        if ($apiKey === '') return null;

        // Per docs, token request includes an identity media-type and a JSON body.
        $res = $this->request(
            'POST',
            $this->getBaseUrl() . '/identity/auth/access-token',
            ['Authorization: Basic ' . $apiKey],
            [
                'grant_type' => 'client_credentials',
                'realm' => $this->isTestMode() ? 'ni' : 'networkinternational',
            ],
            'application/vnd.ni-identity.v1+json',
            'application/vnd.ni-identity.v1+json'
        );

        if (($res['_http_code'] ?? 0) !== 200) {
            $http = (int)($res['_http_code'] ?? 0);
            $rawBody = (string)($res['_raw_body'] ?? '');
            if ($http === 403 && stripos($rawBody, 'Access Denied') !== false) {
                error_log('NgeniusAdapter::getAccessToken blocked by gateway WAF (likely IPv6). Use IPv4 egress or ask Network.ae to whitelist server IP.');
            } else {
                error_log('NgeniusAdapter::getAccessToken failed http=' . $http . ' msg=' . ($res['message'] ?? ''));
            }
            return null;
        }

        $token = $res['access_token'] ?? null;
        return is_string($token) && $token !== '' ? $token : null;
    }

    public function processPayment(array $order, array $paymentData, float $amount, string $currency): array
    {
        $apiKey = $this->getApiKey();
        $outletId = $this->getOutletId();
        if ($apiKey === '' || $outletId === '') {
            return ['success' => false, 'error' => 'Network.ae gateway not configured'];
        }

        $token = $this->getAccessToken();
        if (!$token) {
            return ['success' => false, 'error' => 'Failed to authenticate with Network.ae'];
        }

        $amountMinor = (int)round($amount * 100);
        $merchantOrderRef = (string)($order['order_number'] ?? $order['id'] ?? '');
        $redirectUrl = 'https://secrets.gatvia.com/success/?order=' . urlencode($merchantOrderRef);
        $cancelUrl = 'https://secrets.gatvia.com/checkout/?payment_cancelled=1&order=' . urlencode($merchantOrderRef);

        $body = [
            'action' => 'SALE',
            'amount' => [
                'currencyCode' => strtoupper($currency),
                'value' => $amountMinor,
            ],
            'merchantAttributes' => [
                'redirectUrl' => $redirectUrl,
                'cancelUrl' => $cancelUrl,
            ],
            // Keep our internal reference in a dedicated field.
            // N-Genius will generate its own `reference` (UUID) for the order.
            'merchantOrderReference' => $merchantOrderRef,
        ];

        $res = $this->request(
            'POST',
            $this->getBaseUrl() . '/transactions/outlets/' . rawurlencode($outletId) . '/orders',
            ['Authorization: Bearer ' . $token],
            $body
        );

        $http = (int)($res['_http_code'] ?? 0);
        if ($http !== 201 && $http !== 200) {
            error_log('NgeniusAdapter::processPayment create order failed http=' . $http . ' res=' . json_encode($res));
            return ['success' => false, 'error' => 'Failed to create Network.ae order', 'gateway_response' => $res];
        }

        // Payment link is in response._links.payment.href (docs).
        $paymentUrl = $res['_links']['payment']['href'] ?? null;
        $ngOrderRef = $res['reference'] ?? null; // N-Genius order reference (UUID)
        if (!is_string($ngOrderRef) || $ngOrderRef === '') {
            // Fallback: try to extract from _links.self.href
            $selfHref = $res['_links']['self']['href'] ?? null;
            if (is_string($selfHref) && preg_match('#/orders/([^/]+)$#', $selfHref, $m)) {
                $ngOrderRef = $m[1];
            }
        }

        return [
            'success' => true,
            'status' => 'pending',
            'checkout_url' => $paymentUrl,
            // Store N-Genius order reference (UUID) as transaction_id for later verification.
            'transaction_id' => is_string($ngOrderRef) && $ngOrderRef !== '' ? $ngOrderRef : $merchantOrderRef,
            'gateway_response' => $res,
        ];
    }

    public function verifyPayment(string $transactionId): array
    {
        $apiKey = $this->getApiKey();
        $outletId = $this->getOutletId();
        if ($apiKey === '' || $outletId === '') {
            return ['success' => false, 'error' => 'Network.ae gateway not configured'];
        }

        $token = $this->getAccessToken();
        if (!$token) {
            return ['success' => false, 'error' => 'Failed to authenticate with Network.ae'];
        }

        $res = $this->request(
            'GET',
            $this->getBaseUrl() . '/transactions/outlets/' . rawurlencode($outletId) . '/orders/' . rawurlencode($transactionId),
            ['Authorization: Bearer ' . $token]
        );

        if (($res['_http_code'] ?? 0) !== 200) {
            return ['success' => false, 'error' => 'Failed to retrieve Network.ae order', 'gateway_response' => $res];
        }

        $state = strtoupper((string)($res['_embedded']['payment'][0]['state'] ?? $res['state'] ?? ''));
        // Common N-Genius states: STARTED, AUTHORIZED, CAPTURED, FAILED, CANCELLED (varies by event)
        $mapped = 'pending';
        if (in_array($state, ['CAPTURED', 'PURCHASED', 'AUTHORISED', 'AUTHORIZED', 'SUCCESS', 'PAID'], true)) {
            $mapped = 'completed';
        }
        if (in_array($state, ['FAILED', 'CANCELLED', 'DECLINED'], true)) $mapped = 'failed';

        return [
            'success' => true,
            'status' => $mapped,
            'gateway_status' => $state,
            'gateway_response' => $res,
        ];
    }

    public function handleWebhook(array $data): array
    {
        // We will treat webhook payload as a hint and validate by retrieving order status when possible.
        $ref = $data['order']['reference']
            ?? $data['order']['_id'] ?? null;
        if (is_string($ref) && str_contains($ref, 'urn:order:')) {
            $ref = preg_replace('#^urn:order:#', '', $ref);
        }
        if (!is_string($ref) || $ref === '') {
            $ref = $data['reference'] ?? $data['orderReference'] ?? $data['orderRef'] ?? null;
        }
        if (!is_string($ref) || $ref === '') {
            return ['processed' => false, 'error' => 'Missing reference'];
        }

        $verification = $this->verifyPayment($ref);
        if (!($verification['success'] ?? false)) {
            return ['processed' => false, 'error' => 'Verification failed', 'gateway_response' => $verification['gateway_response'] ?? null];
        }

        $merchantOrderRef = $data['order']['merchantOrderReference']
            ?? $data['merchantOrderReference']
            ?? ($verification['gateway_response']['merchantOrderReference'] ?? null);

        return [
            'processed' => true,
            'reference' => $ref, // N-Genius order reference (UUID)
            'merchant_order_reference' => $merchantOrderRef,
            'status' => $verification['status'] ?? 'pending',
            'gateway_response' => $verification['gateway_response'] ?? [],
        ];
    }
}

