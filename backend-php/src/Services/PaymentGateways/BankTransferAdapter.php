<?php

namespace App\Services\PaymentGateways;

use App\Services\PaymentGatewayInterface;

class BankTransferAdapter implements PaymentGatewayInterface
{
    public function processPayment(array $order, array $paymentData, float $amount, string $currency): array
    {
        $transactionId = "BT-" . strtoupper(substr(md5($order['order_number'] . time()), 0, 12));
        
        return [
            'success' => true,
            'transaction_id' => $transactionId,
            'status' => 'pending',
            'gateway_response' => [
                'method' => 'bank_transfer',
                'status' => 'pending_manual_confirmation',
            ],
        ];
    }
    
    public function verifyPayment(string $transactionId): array
    {
        return ['status' => 'pending'];
    }
    
    public function handleWebhook(array $data): array
    {
        return ['processed' => false, 'message' => 'Bank transfers do not support webhooks'];
    }
}


