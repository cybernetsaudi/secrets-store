<?php

namespace App\Services;

/**
 * Rate Limiter Service
 * Implements per-IP rate limiting to prevent abuse
 */
class RateLimiter
{
    private const DEFAULT_LIMIT = 100; // requests per window
    private const DEFAULT_WINDOW = 60; // seconds
    private static string $storageDir;
    
    public static function init(): void
    {
        self::$storageDir = __DIR__ . '/../../storage/rate_limits';
        if (!is_dir(self::$storageDir)) {
            mkdir(self::$storageDir, 0755, true);
        }
    }
    
    /**
     * Check if request is allowed
     * @param string $identifier IP address or user ID
     * @param int $limit Requests per window
     * @param int $window Window in seconds
     * @return array ['allowed' => bool, 'remaining' => int, 'reset' => int]
     */
    public static function check(string $identifier, int $limit = self::DEFAULT_LIMIT, int $window = self::DEFAULT_WINDOW): array
    {
        self::init();
        
        // Sanitize identifier for filename
        $safeIdentifier = preg_replace('/[^a-zA-Z0-9_-]/', '_', $identifier);
        $file = self::$storageDir . '/' . $safeIdentifier . '.json';
        
        $now = time();
        $data = [];
        
        if (file_exists($file)) {
            $content = file_get_contents($file);
            $data = json_decode($content, true) ?: [];
        }
        
        // Reset if window expired
        if (!isset($data['reset']) || $now > $data['reset']) {
            $data = [
                'count' => 0,
                'reset' => $now + $window,
            ];
        }
        
        // Increment count
        $data['count']++;
        $remaining = max(0, $limit - $data['count']);
        $allowed = $data['count'] <= $limit;
        
        // Save updated data
        file_put_contents($file, json_encode($data), LOCK_EX);
        
        // Cleanup old files (older than 1 hour)
        self::cleanup();
        
        return [
            'allowed' => $allowed,
            'remaining' => $remaining,
            'reset' => $data['reset'],
            'limit' => $limit,
        ];
    }
    
    /**
     * Cleanup old rate limit files
     */
    private static function cleanup(): void
    {
        $files = glob(self::$storageDir . '/*.json');
        $cutoff = time() - 3600; // 1 hour
        
        foreach ($files as $file) {
            if (filemtime($file) < $cutoff) {
                @unlink($file);
            }
        }
    }
    
    /**
     * Get client IP address
     */
    public static function getClientIp(): string
    {
        $ipKeys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}







