<?php

namespace App\Controllers;

use App\Services\CurrencyService;

class CurrencyController
{
    public function getRate(): array
    {
        $from = $_GET['from'] ?? 'PKR';
        $to = $_GET['to'] ?? 'USD';
        
        $service = new CurrencyService();
        $rate = $service->getRate($from, $to);
        
        return [
            'from_currency' => $from,
            'to_currency' => $to,
            'rate' => (string)$rate,
        ];
    }
}


