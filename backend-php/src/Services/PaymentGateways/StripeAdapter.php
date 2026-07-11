<?php

namespace App\Services\PaymentGateways;

use App\Services\PaymentGatewayInterface;
use App\Models\PaymentGateway;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Exception\ApiErrorException;

class StripeAdapter implements PaymentGatewayInterface
{
    public function __construct()
    {
        // IMPORTANT: Prefer database secret to match frontend publishable key from database.
        // Frontend now uses keys from database, so backend should too.
        // Only use env key as fallback if database key is not available.
        $gateway = PaymentGateway::findAnyByType('stripe');
        $dbSecret = $gateway['api_secret'] ?? '';
        $envSecret = $_ENV['STRIPE_SECRET_KEY'] ?? '';
        // Prioritize database key (matches frontend), fallback to env if database is empty
        $secretKey = !empty($dbSecret) ? $dbSecret : $envSecret;
        Stripe::setApiKey($secretKey);
    }
    
    public function processPayment(array $order, array $paymentData, float $amount, string $currency): array
    {
        try {
            $amountCents = intval($amount * 100);
            
            $intent = PaymentIntent::create([
                'amount' => $amountCents,
                'currency' => strtolower($currency),
                'payment_method' => $paymentData['payment_method_id'] ?? null,
                'confirmation_method' => 'manual',
                'confirm' => true,
                'metadata' => [
                    'order_number' => $order['order_number'],
                    'order_id' => (string)$order['id'],
                ],
            ]);
            
            if ($intent->status === 'succeeded') {
                return [
                    'success' => true,
                    'transaction_id' => $intent->id,
                    'status' => 'completed',
                    'gateway_response' => $intent->toArray(),
                ];
            } elseif ($intent->status === 'requires_action') {
                return [
                    'success' => false,
                    'requires_action' => true,
                    'client_secret' => $intent->client_secret,
                    'gateway_response' => $intent->toArray(),
                ];
            }
            
            return [
                'success' => false,
                'error' => "Payment status: {$intent->status}",
                'gateway_response' => $intent->toArray(),
            ];
        } catch (ApiErrorException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'gateway_response' => [],
            ];
        }
    }
    
    public function verifyPayment(string $transactionId): array
    {
        try {
            $intent = PaymentIntent::retrieve($transactionId);
            
            $statusMap = [
                'succeeded' => 'completed',
                'processing' => 'pending',
                'requires_payment_method' => 'failed',
                'canceled' => 'failed',
            ];
            
            return [
                'status' => $statusMap[$intent->status] ?? 'pending',
                'amount' => $intent->amount / 100,
                'currency' => strtoupper($intent->currency),
                'gateway_response' => $intent->toArray(),
            ];
        } catch (ApiErrorException $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'gateway_response' => [],
            ];
        }
    }
    
    public function handleWebhook(array $data): array
    {
        // Webhook handling logic
        return ['processed' => false, 'message' => 'Not implemented'];
    }
}

