<?php
/**
 * Quick script to set Tabby production keys
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;

Database::getInstance();

$keys = [
    'api_secret' => 'sk_01956b47-9761-fd31-cb12-6dfbb14b2e93',
    'public_key' => 'pk_01956b47-9761-fd31-cb12-6dfb5b2b4087',
    'merchant_id' => 'GUFC',
];

Database::query(
    "UPDATE payment_gateways 
     SET api_secret = ?, public_key = ?, merchant_id = ?, is_test_mode = 0, is_active = 1, updated_at = NOW()
     WHERE gateway_type = 'tabby'",
    [$keys['api_secret'], $keys['public_key'], $keys['merchant_id']]
);

$stmt = Database::query(
    "SELECT LEFT(api_secret, 25) as api_secret, LEFT(public_key, 25) as public_key, merchant_id, is_test_mode, is_active 
     FROM payment_gateways WHERE gateway_type = 'tabby'"
);
$result = $stmt->fetch();

echo "✅ Keys updated!\n";
echo "API Secret: {$result['api_secret']}...\n";
echo "Public Key: {$result['public_key']}...\n";
echo "Merchant ID: {$result['merchant_id']}\n";
echo "is_test_mode: {$result['is_test_mode']}\n";
echo "is_active: {$result['is_active']}\n";

