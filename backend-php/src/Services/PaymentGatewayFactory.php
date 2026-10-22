<?php

namespace App\Services;

use App\Services\PaymentGateways\StripeAdapter;
use App\Services\PaymentGateways\ApplePayAdapter;
use App\Services\PaymentGateways\BankTransferAdapter;
use App\Services\PaymentGateways\TabbyAdapter;
use App\Services\PaymentGateways\TamaraAdapter;
use App\Services\PaymentGateways\NgeniusAdapter;
use App\Services\PaymentGateways\SafepayAdapter;

class PaymentGatewayFactory
{
    private static array $gateways = [
        'stripe' => StripeAdapter::class,
        'apple_pay' => ApplePayAdapter::class,
        'bank_transfer' => BankTransferAdapter::class,
        'tabby' => TabbyAdapter::class,
        'tamara' => TamaraAdapter::class,
        'ngenius' => NgeniusAdapter::class,
        'safepay' => SafepayAdapter::class,
    ];
    
    public static function getGateway(string $name): ?PaymentGatewayInterface
    {
        $class = self::$gateways[strtolower($name)] ?? null;
        return $class ? new $class() : null;
    }
}

interface PaymentGatewayInterface
{
    public function processPayment(array $order, array $paymentData, float $amount, string $currency): array;
    public function verifyPayment(string $transactionId): array;
    public function handleWebhook(array $data): array;
}


