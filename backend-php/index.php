<?php
/**
 * Gulf United FC E-Commerce API
 * Main entry point for all API requests
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Core\Router;
use App\Core\Database;
use App\Core\LoggingMiddleware;
use App\Services\RateLimiter;
use Dotenv\Dotenv;

// Load environment variables
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

// Start session for admin authentication
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set error reporting - always disabled in production
$debug = ($_ENV['DEBUG'] ?? '0') === '1' || ($_ENV['DEBUG'] ?? '0') === 'true';
$isProduction = ($_ENV['APP_ENV'] ?? 'production') === 'production';

error_reporting(E_ALL);
// Never display errors in production
ini_set('display_errors', ($debug && !$isProduction) ? '1' : '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error_log');

// Set CORS headers with strict origin validation
$allowedOrigins = $_ENV['CORS_ALLOWED_ORIGINS'] ?? 'https://secrets.gatvia.com,https://www.secrets.gatvia.com';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!empty($origin)) {
    $allowedOriginsArray = array_map('trim', explode(',', $allowedOrigins));
    if (in_array($origin, $allowedOriginsArray)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
} elseif ($allowedOrigins === '*') {
    // Only allow * in development
    $debug = ($_ENV['DEBUG'] ?? '0') === '1' || ($_ENV['DEBUG'] ?? '0') === 'true';
    if ($debug) {
        header('Access-Control-Allow-Origin: *');
    }
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
header('Access-Control-Allow-Credentials: true');
// Only set JSON content type if not a file upload
if (strpos($_SERVER['REQUEST_URI'] ?? '', '/api/uploads/') === false) {
    header('Content-Type: application/json');
}

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Initialize database connection
// Don't exit on failure - let routes handle it (some routes don't need DB)
try {
    Database::getInstance();
} catch (Exception $e) {
    // Log error but don't exit - some endpoints might not need DB
    error_log("Database connection failed: " . $e->getMessage());
    // Only exit if this is a critical endpoint that requires DB
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if (strpos($uri, '/api/admin/') !== false || strpos($uri, '/api/products') !== false || strpos($uri, '/api/checkout') !== false) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        exit;
    }
}

// Start request logging and timing
$requestStartTime = microtime(true);
LoggingMiddleware::logRequest();

// Rate limiting (skip for webhooks and file uploads)
$uri = $_SERVER['REQUEST_URI'] ?? '';
$skipRateLimit = strpos($uri, '/api/webhooks/') !== false || 
                  strpos($uri, '/api/uploads/') !== false ||
                  strpos($uri, '/api/settings/logo') !== false;

if (!$skipRateLimit) {
    $clientIp = RateLimiter::getClientIp();
    $rateLimit = RateLimiter::check($clientIp);
    
    if (!$rateLimit['allowed']) {
        http_response_code(429);
        header('X-RateLimit-Limit: ' . $rateLimit['limit']);
        header('X-RateLimit-Remaining: 0');
        header('X-RateLimit-Reset: ' . $rateLimit['reset']);
        header('Retry-After: ' . ($rateLimit['reset'] - time()));
        echo json_encode([
            'error' => 'Rate limit exceeded',
            'message' => 'Too many requests. Please try again later.',
            'retry_after' => $rateLimit['reset'] - time()
        ]);
        
        $responseTime = microtime(true) - $requestStartTime;
        LoggingMiddleware::logResponse(429, $responseTime, 'Rate limit exceeded');
        exit;
    }
    
    // Set rate limit headers
    header('X-RateLimit-Limit: ' . $rateLimit['limit']);
    header('X-RateLimit-Remaining: ' . $rateLimit['remaining']);
    header('X-RateLimit-Reset: ' . $rateLimit['reset']);
}

// Initialize router
$router = new Router();

// API Routes
require_once __DIR__ . '/routes/api.php';

// Handle request
try {
    $router->dispatch();
    
    // Log successful response
    $responseTime = microtime(true) - $requestStartTime;
    $statusCode = http_response_code() ?: 200;
    LoggingMiddleware::logResponse($statusCode, $responseTime);
} catch (Exception $e) {
    // Always log full error details server-side
    error_log("Router dispatch error: " . $e->getMessage());
    error_log("Router dispatch trace: " . $e->getTraceAsString());
    error_log("Router dispatch file: " . $e->getFile() . ":" . $e->getLine());
    
    http_response_code(500);
    
    // Only show detailed errors in debug mode (non-production)
    $debug = ($_ENV['DEBUG'] ?? '0') === '1' || ($_ENV['DEBUG'] ?? '0') === 'true';
    $isProduction = ($_ENV['APP_ENV'] ?? 'production') === 'production';
    
    $errorResponse = [
        'error' => 'Internal server error',
        'message' => 'An error occurred. Please contact support if this persists.'
    ];
    
    // Only include detailed error in non-production debug mode
    if ($debug && !$isProduction) {
        $errorResponse['debug'] = [
            'message' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ];
    }
    
    echo json_encode($errorResponse);
    
    // Log error response
    $responseTime = microtime(true) - $requestStartTime;
    LoggingMiddleware::logResponse(500, $responseTime, $e->getMessage());
}

