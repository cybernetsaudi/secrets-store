<?php
/**
 * Smoke-test Safepay API credentials from DB.
 * Usage: php scripts/test_safepay.php
 */
require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\PaymentGateway;
use App\Services\PaymentGatewayFactory;
use Dotenv\Dotenv;

$envPath = __DIR__ . '/..';
if (file_exists($envPath . '/.env')) {
    Dotenv::createImmutable($envPath)->safeLoad();
}

$row = PaymentGateway::findAnyByType('safepay');
if (!$row) {
    echo "No safepay gateway row found. Run configure_safepay.php first.\n";
    exit(1);
}

echo "Safepay gateway: test_mode=" . ($row['is_test_mode'] ? 'yes' : 'no') . "\n";
echo "Public key: " . substr((string)($row['public_key'] ?? ''), 0, 24) . "...\n";

$adapter = PaymentGatewayFactory::getGateway('safepay');
if (!$adapter) {
    echo "Failed to load Safepay adapter\n";
    exit(1);
}
$result = $adapter->processPayment(
    [
        'order_number' => 'TEST-' . date('YmdHis'),
        'guest_name' => 'Test User',
        'guest_email' => 'test@example.com',
        'guest_phone' => '+923001234567',
    ],
    [],
    1000.0,
    'PKR'
);

if (!($result['success'] ?? false)) {
    echo "FAILED: " . ($result['error'] ?? 'unknown error') . "\n";
    if (!empty($result['gateway_response'])) {
        echo json_encode($result['gateway_response'], JSON_PRETTY_PRINT) . "\n";
    }
    exit(1);
}

echo "SUCCESS\n";
echo "Tracker: " . ($result['transaction_id'] ?? '') . "\n";
echo "Checkout URL: " . substr((string)($result['checkout_url'] ?? ''), 0, 120) . "...\n";

$verify = $adapter->verifyPayment((string)($result['transaction_id'] ?? ''));
echo "Verify status: " . ($verify['status'] ?? 'unknown') . " (" . ($verify['gateway_status'] ?? '') . ")\n";
