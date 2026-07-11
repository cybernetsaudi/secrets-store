<?php
/**
 * Test Tabby Checkout - Simulate a payment to see what Tabby returns
 */

chdir(__DIR__ . '/..');

// Load .env file first
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        $value = trim($value, '"\'');
        $_ENV[$name] = $value;
        putenv("{$name}={$value}");
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use App\Services\PaymentGatewayFactory;
use App\Models\Order;

echo "🧪 Testing Tabby Checkout API Call\n";
echo "==================================\n\n";

try {
    // Get Tabby gateway
    $gateway = PaymentGatewayFactory::getGateway('tabby');
    if (!$gateway) {
        echo "❌ ERROR: Could not get Tabby gateway\n";
        exit(1);
    }
    
    // Create a test order structure
    $testOrder = [
        'id' => 999,
        'order_number' => 'GUFC-TEST-' . time(),
        'guest_name' => 'Test User',
        'guest_email' => 'test@example.com',
        'guest_phone' => '+971501234567',
        'total_amount' => 1000.00,
        'vat_amount' => 50.00,
        'currency' => 'AED',
        'items' => [
            [
                'product_id' => 1,
                'product_name' => 'Test Product',
                'variant_name' => null,
                'quantity' => 1,
                'unit_price' => 1000.00,
            ]
        ],
    ];
    
    echo "📤 Making Tabby API call...\n";
    echo "   Order Number: {$testOrder['order_number']}\n";
    echo "   Amount: {$testOrder['total_amount']} {$testOrder['currency']}\n\n";
    
    // Call processPayment
    $result = $gateway->processPayment($testOrder, [], 1000.00, 'AED');
    
    echo "📥 Tabby Response:\n";
    echo "   Success: " . ($result['success'] ? 'YES' : 'NO') . "\n";
    if (isset($result['checkout_url'])) {
        echo "   ✅ Checkout URL: {$result['checkout_url']}\n";
    } else {
        echo "   ❌ Checkout URL: NOT FOUND\n";
    }
    if (isset($result['error'])) {
        echo "   Error: {$result['error']}\n";
    }
    if (isset($result['http_code'])) {
        echo "   HTTP Code: {$result['http_code']}\n";
    }
    if (isset($result['rejection_code'])) {
        echo "   Rejection Code: {$result['rejection_code']}\n";
    }
    if (isset($result['rejection_reason'])) {
        echo "   Rejection Reason: {$result['rejection_reason']}\n";
    }
    
    echo "\n";
    echo "📋 Full Response:\n";
    echo json_encode($result, JSON_PRETTY_PRINT) . "\n";
    
    if ($result['success'] && !empty($result['checkout_url'])) {
        echo "\n✅ SUCCESS: Checkout URL found - redirect should work!\n";
    } else {
        echo "\n❌ FAILURE: No checkout URL - this is why redirect isn't happening\n";
        echo "   Check server logs for full Tabby API response\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

