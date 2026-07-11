<?php
/**
 * Simple API Test Script
 * Run: php test_api.php
 */

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use App\Models\Product;

// Load environment
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $products = Product::all();
    echo json_encode([
        'success' => true,
        'count' => count($products),
        'results' => $products
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}


