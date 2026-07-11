<?php

namespace App\Services;

use App\Core\Database;

class CurrencyService
{
    private array $cache = [];
    private int $cacheDuration = 3600; // 1 hour
    
    public function getRate(string $from, string $to): float
    {
        if ($from === $to) {
            return 1.0;
        }
        
        $cacheKey = "{$from}-{$to}";
        
        // Check cache
        $cached = $this->getCachedRate($from, $to);
        if ($cached !== null) {
            return $cached;
        }
        
        // Fetch from API
        $rate = $this->fetchFromAPI($from, $to);
        
        if ($rate) {
            $this->cacheRate($from, $to, $rate);
        }
        
        return $rate ?: 1.0;
    }
    
    private function getCachedRate(string $from, string $to): ?float
    {
        $now = date('Y-m-d H:i:s');
        $stmt = Database::query(
            "SELECT rate FROM currency_exchanges 
             WHERE from_currency = ? AND to_currency = ? 
             AND valid_from <= ? AND valid_to >= ?
             ORDER BY created_at DESC LIMIT 1",
            [$from, $to, $now, $now]
        );
        
        $result = $stmt->fetch();
        return $result ? floatval($result['rate']) : null;
    }
    
    private function fetchFromAPI(string $from, string $to): ?float
    {
        $apiUrl = $_ENV['FX_RATE_API_URL'] ?? 'https://api.exchangerate-api.com/v4/latest/AED';
        
        try {
            $ch = curl_init($apiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $response = curl_exec($ch);
            curl_close($ch);
            
            if ($response) {
                $data = json_decode($response, true);
                $rates = $data['rates'] ?? [];
                $base = $data['base'] ?? 'AED';
                
                if ($base === $from) {
                    return floatval($rates[$to] ?? 1.0);
                } elseif ($base === $to) {
                    return 1.0 / floatval($rates[$from] ?? 1.0);
                } else {
                    $fromRate = floatval($rates[$from] ?? 1.0);
                    $toRate = floatval($rates[$to] ?? 1.0);
                    return $toRate / $fromRate;
                }
            }
        } catch (\Exception $e) {
            error_log("Currency API error: " . $e->getMessage());
        }
        
        return null;
    }
    
    private function cacheRate(string $from, string $to, float $rate): void
    {
        $now = date('Y-m-d H:i:s');
        $validTo = date('Y-m-d H:i:s', strtotime("+{$this->cacheDuration} seconds"));
        
        Database::query(
            "INSERT INTO currency_exchanges (from_currency, to_currency, rate, valid_from, valid_to, source)
             VALUES (?, ?, ?, ?, ?, 'api')",
            [$from, $to, $rate, $now, $validTo]
        );
    }
}


