<?php

namespace App\Services\PaymentGateways;

use App\Models\PaymentGateway;
use App\Services\PaymentGatewayInterface;

/**
 * Safepay Express Checkout (hosted redirect)
 * Docs: https://safepay-docs.netlify.app/build-your-integration/express-checkout/
 */
class SafepayAdapter implements PaymentGatewayInterface
{
    private array $gatewayConfig;

    public function __construct()
    {
        $this->gatewayConfig = PaymentGateway::findAnyByType('safepay') ?? [];
    }

    private function isTestMode(): bool
    {
        return !empty($this->gatewayConfig['is_test_mode']);
    }

    private function getSecretKey(): string
    {
        return trim((string)($this->gatewayConfig['api_secret'] ?? ''));
    }

    private function getMerchantApiKey(): string
    {
        return trim((string)($this->gatewayConfig['public_key'] ?? $this->gatewayConfig['api_key'] ?? ''));
    }

    private function getApiHost(): string
    {
        return $this->isTestMode()
            ? 'https://sandbox.api.getsafepay.com'
            : 'https://api.getsafepay.com';
    }

    private function getEmbeddedBaseUrl(): string
    {
        // Matches @sfpy/node-core Checkout hostUrls
        return $this->isTestMode()
            ? 'https://sandbox.api.getsafepay.com/embedded/'
            : 'https://getsafepay.com/embedded/';
    }

    /** CYBERSOURCE (default) or MPGS — set safepay_intent in gateway additional_config */
    private function getPaymentIntent(): string
    {
        $intent = strtoupper(trim((string)($this->gatewayConfig['safepay_intent'] ?? 'CYBERSOURCE')));
        return in_array($intent, ['CYBERSOURCE', 'MPGS'], true) ? $intent : 'CYBERSOURCE';
    }

    private function buildQueryParams(array $params): string
    {
        $parts = [];
        foreach ($params as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $parts[] = rawurlencode((string)$key) . '=' . rawurlencode((string)$value);
        }
        return implode('&', $parts);
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        $secret = $this->getSecretKey();
        if ($secret === '') {
            return ['_http_code' => 0, 'error' => 'Safepay secret key not configured'];
        }

        $url = $this->getApiHost() . $path;
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-SFPY-MERCHANT-SECRET: ' . $secret,
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $raw = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            return ['_http_code' => 0, 'error' => $err];
        }

        $data = json_decode((string)$raw, true);
        if (!is_array($data)) {
            $data = [];
        }
        $data['_http_code'] = $httpCode;
        $data['_raw_body'] = (string)$raw;
        return $data;
    }

    private function createPassportToken(): ?string
    {
        $res = $this->request('POST', '/client/passport/v1/token', []);
        if (($res['_http_code'] ?? 0) !== 200) {
            error_log('SafepayAdapter::createPassportToken failed http=' . ($res['_http_code'] ?? 0));
            return null;
        }

        $token = $res['data'] ?? null;
        return is_string($token) && $token !== '' ? $token : null;
    }

    private function amountMinor(float $amount, string $currency): int
    {
        // Safepay expects lowest denomination (e.g. paisa for PKR).
        return (int)round($amount * 100);
    }

    private function buildCheckoutUrl(
        string $tracker,
        string $passportToken,
        string $redirectUrl,
        string $cancelUrl
    ): string {
        $environment = $this->isTestMode() ? 'sandbox' : 'production';
        $query = $this->buildQueryParams([
            'environment' => $environment,
            'tracker' => $tracker,
            'tbt' => $passportToken,
            'source' => 'hosted',
            'redirect_url' => $redirectUrl,
            'cancel_url' => $cancelUrl,
        ]);

        return $this->getEmbeddedBaseUrl() . '?' . $query;
    }

    public function processPayment(array $order, array $paymentData, float $amount, string $currency): array
    {
        $merchantApiKey = $this->getMerchantApiKey();
        $secret = $this->getSecretKey();
        if ($merchantApiKey === '' || $secret === '') {
            return [
                'success' => false,
                'error' => 'Safepay is not configured. Add your public and secret keys in Payment Gateways settings.',
            ];
        }

        $orderNumber = (string)($order['order_number'] ?? $order['id'] ?? '');
        $baseUrl = rtrim((string)($_ENV['FRONTEND_URL'] ?? 'https://secrets.gatvia.com'), '/');
        $redirectUrl = "{$baseUrl}/success/?order={$orderNumber}";
        $cancelUrl = "{$baseUrl}/success/?order={$orderNumber}&status=cancelled";

        $intent = $this->getPaymentIntent();

        $sessionBody = [
            'merchant_api_key' => $merchantApiKey,
            'intent' => $intent,
            'mode' => 'payment',
            'entry_mode' => 'raw',
            'currency' => strtoupper($currency),
            'amount' => $this->amountMinor($amount, $currency),
            'metadata' => [
                'order_id' => $orderNumber,
            ],
            'include_fees' => false,
        ];

        $session = $this->request('POST', '/order/payments/v3/', $sessionBody);
        $sessionHttp = (int)($session['_http_code'] ?? 0);
        if ($sessionHttp !== 200 && $sessionHttp !== 201) {
            $message = $session['status']['message'] ?? 'Failed to create Safepay payment session';
            error_log('SafepayAdapter::processPayment session failed intent=' . $intent . ' ' . json_encode($session));
            return [
                'success' => false,
                'error' => is_string($message) ? $message : 'Failed to create Safepay payment session',
                'gateway_response' => $session,
            ];
        }

        $capabilities = $session['data']['capabilities'] ?? [];
        if (is_array($capabilities) && array_key_exists($intent, $capabilities) && !$capabilities[$intent]) {
            error_log('SafepayAdapter::processPayment intent not enabled: ' . $intent);
            return [
                'success' => false,
                'error' => "Safepay intent {$intent} is not enabled on your merchant account. Contact Safepay support or switch intent in Payment Gateways.",
                'gateway_response' => $session,
            ];
        }

        $tracker = $session['data']['tracker']['token'] ?? null;
        if (!is_string($tracker) || $tracker === '') {
            return [
                'success' => false,
                'error' => 'Safepay did not return a payment tracker',
                'gateway_response' => $session,
            ];
        }

        $passportToken = $this->createPassportToken();
        if (!$passportToken) {
            return [
                'success' => false,
                'error' => 'Failed to create Safepay authentication token',
                'gateway_response' => $session,
            ];
        }

        $checkoutUrl = $this->buildCheckoutUrl($tracker, $passportToken, $redirectUrl, $cancelUrl);

        return [
            'success' => true,
            'status' => 'pending',
            'checkout_url' => $checkoutUrl,
            'transaction_id' => $tracker,
            'gateway_response' => $session,
        ];
    }

    public function verifyPayment(string $transactionId): array
    {
        $res = $this->request('GET', '/reporter/api/v1/payments/' . rawurlencode($transactionId));
        if (($res['_http_code'] ?? 0) !== 200) {
            return [
                'success' => false,
                'error' => 'Failed to verify Safepay payment',
                'gateway_response' => $res,
            ];
        }

        $state = strtoupper((string)($res['data']['state'] ?? $res['data']['tracker']['state'] ?? ''));
        $mapped = 'pending';
        if ($state === 'TRACKER_ENDED') {
            $mapped = 'completed';
        } elseif (in_array($state, ['TRACKER_FAILED', 'TRACKER_CANCELLED', 'TRACKER_EXPIRED'], true)) {
            $mapped = 'failed';
        }

        return [
            'success' => true,
            'status' => $mapped,
            'gateway_status' => $state,
            'gateway_response' => $res,
        ];
    }

    public function handleWebhook(array $data): array
    {
        $tracker = $data['tracker']
            ?? $data['data']['tracker']
            ?? $data['data']['token']
            ?? null;

        if (!is_string($tracker) || $tracker === '') {
            return ['processed' => false, 'error' => 'Missing tracker'];
        }

        $verification = $this->verifyPayment($tracker);
        if (!($verification['success'] ?? false)) {
            return [
                'processed' => false,
                'error' => $verification['error'] ?? 'Verification failed',
                'gateway_response' => $verification['gateway_response'] ?? null,
            ];
        }

        $orderNumber = null;
        $metadata = $data['metadata'] ?? $data['data']['metadata'] ?? [];
        if (is_array($metadata)) {
            $orderNumber = $metadata['order_id'] ?? $metadata['order_number'] ?? null;
        }

        return [
            'processed' => true,
            'reference' => $tracker,
            'merchant_order_reference' => is_string($orderNumber) ? $orderNumber : null,
            'status' => $verification['status'] ?? 'pending',
            'gateway_response' => $verification['gateway_response'] ?? [],
        ];
    }
}
