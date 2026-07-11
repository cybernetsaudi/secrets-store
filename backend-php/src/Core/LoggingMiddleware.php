<?php

namespace App\Core;

/**
 * Logging Middleware
 * Logs all API requests and responses for debugging and audit trail
 */
class LoggingMiddleware
{
    private static string $logFile;
    
    public static function init(): void
    {
        $logDir = __DIR__ . '/../../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        self::$logFile = $logDir . '/api_' . date('Y-m-d') . '.log';
    }
    
    /**
     * Log request
     */
    public static function logRequest(): void
    {
        self::init();
        
        $method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
        $uri = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN';
        $timestamp = date('Y-m-d H:i:s');
        
        $logEntry = [
            'timestamp' => $timestamp,
            'type' => 'request',
            'method' => $method,
            'uri' => $uri,
            'ip' => $ip,
            'user_agent' => $userAgent,
            'query_string' => $_SERVER['QUERY_STRING'] ?? '',
        ];
        
        // Log POST data (but not passwords)
        if ($method === 'POST' || $method === 'PUT') {
            $postData = $_POST;
            // Remove sensitive data
            unset($postData['password'], $postData['email_password'], $postData['api_key'], $postData['api_secret']);
            $logEntry['post_data'] = $postData;
        }
        
        self::writeLog($logEntry);
    }
    
    /**
     * Log response
     */
    public static function logResponse(int $statusCode, float $responseTime, ?string $error = null): void
    {
        self::init();
        
        $method = $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN';
        $uri = $_SERVER['REQUEST_URI'] ?? 'UNKNOWN';
        $timestamp = date('Y-m-d H:i:s');
        
        $logEntry = [
            'timestamp' => $timestamp,
            'type' => 'response',
            'method' => $method,
            'uri' => $uri,
            'status_code' => $statusCode,
            'response_time_ms' => round($responseTime * 1000, 2),
        ];
        
        if ($error) {
            $logEntry['error'] = $error;
        }
        
        self::writeLog($logEntry);
    }
    
    /**
     * Write log entry to file
     */
    private static function writeLog(array $entry): void
    {
        $logLine = json_encode($entry) . "\n";
        file_put_contents(self::$logFile, $logLine, FILE_APPEND | LOCK_EX);
        
        // Rotate logs older than 30 days
        self::rotateLogs();
    }
    
    /**
     * Rotate old log files (keep 30 days)
     */
    private static function rotateLogs(): void
    {
        $logDir = __DIR__ . '/../../logs';
        $files = glob($logDir . '/api_*.log');
        $cutoffTime = time() - (30 * 24 * 60 * 60); // 30 days
        
        foreach ($files as $file) {
            if (filemtime($file) < $cutoffTime) {
                @unlink($file);
            }
        }
    }
    
    /**
     * Log error
     */
    public static function logError(string $message, array $context = []): void
    {
        self::init();
        
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => 'error',
            'message' => $message,
            'context' => $context,
            'file' => debug_backtrace()[1]['file'] ?? 'unknown',
            'line' => debug_backtrace()[1]['line'] ?? 0,
        ];
        
        self::writeLog($logEntry);
    }
}







