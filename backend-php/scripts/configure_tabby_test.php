<?php
/**
 * Configure Tabby Test Credentials
 * Run this script to update Tabby gateway with test API keys
 * 
 * Usage: php scripts/configure_tabby_test.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use App\Models\PaymentGateway;

// Initialize database connection
try {
    Database::getInstance();
    echo "✅ Database connection established\n\n";
} catch (Exception $e) {
    die("❌ Database connection failed: " . $e->getMessage() . "\n");
}

// Test credentials from Tabby support
$testCredentials = [
    'api_secret' => 'sk_test_01956b47-9761-fd31-cb12-6dfcacf3c59c',
    'public_key' => 'pk_test_01956b47-9761-fd31-cb12-6dfc6adaf5b3',
    'merchant_id' => 'GUFC',
    'is_test_mode' => 1, // Test mode ON
    'is_active' => 1,    // Active for testing
];

// Find Tabby gateway
$tabbyGateway = PaymentGateway::findAnyByType('tabby');

if (!$tabbyGateway) {
    echo "❌ Tabby gateway not found in database. Creating new entry...\n";
    
    // Create Tabby gateway if it doesn't exist
    $tabbyGateway = PaymentGateway::create([
        'gateway_name' => 'Tabby',
        'gateway_type' => 'tabby',
        'is_active' => 1,
        'is_test_mode' => 1,
        'api_secret' => $testCredentials['api_secret'],
        'public_key' => $testCredentials['public_key'],
        'merchant_id' => $testCredentials['merchant_id'],
    ]);
    
    echo "✅ Tabby gateway created\n\n";
} else {
    echo "✅ Found Tabby gateway (ID: {$tabbyGateway['id']})\n";
    echo "📝 Current configuration:\n";
    echo "   - Test Mode: " . ($tabbyGateway['is_test_mode'] ? 'ON' : 'OFF') . "\n";
    echo "   - Active: " . ($tabbyGateway['is_active'] ? 'YES' : 'NO') . "\n";
    echo "   - Merchant Code: " . ($tabbyGateway['merchant_id'] ?? 'NOT SET') . "\n";
    echo "   - Public Key: " . (empty($tabbyGateway['public_key']) ? 'NOT SET' : substr($tabbyGateway['public_key'], 0, 20) . '...') . "\n";
    echo "   - Secret Key: " . (empty($tabbyGateway['api_secret']) ? 'NOT SET' : substr($tabbyGateway['api_secret'], 0, 20) . '...') . "\n\n";
    
    echo "🔄 Updating with test credentials...\n";
    
    // Update with test credentials
    $updated = PaymentGateway::update($tabbyGateway['id'], $testCredentials);
    
    if ($updated) {
        echo "✅ Tabby test credentials updated successfully!\n\n";
    } else {
        die("❌ Failed to update Tabby credentials\n");
    }
}

// Verify the update
$updatedGateway = PaymentGateway::find($tabbyGateway['id']);

echo "✅ Verification:\n";
echo "   - Test Mode: " . ($updatedGateway['is_test_mode'] ? 'ON ✅' : 'OFF ❌') . "\n";
echo "   - Active: " . ($updatedGateway['is_active'] ? 'YES ✅' : 'NO ❌') . "\n";
echo "   - Merchant Code: " . ($updatedGateway['merchant_id'] ?? 'NOT SET ❌') . "\n";
echo "   - Public Key: " . (empty($updatedGateway['public_key']) ? 'NOT SET ❌' : 'SET ✅ (' . substr($updatedGateway['public_key'], 0, 20) . '...)') . "\n";
echo "   - Secret Key: " . (empty($updatedGateway['api_secret']) ? 'NOT SET ❌' : 'SET ✅ (' . substr($updatedGateway['api_secret'], 0, 20) . '...)') . "\n\n";

echo "🎉 Tabby test configuration complete!\n";
echo "\n📋 Next Steps:\n";
echo "   1. Test Tabby checkout on your store\n";
echo "   2. Verify payment flow works correctly\n";
echo "   3. Once confirmed, request live keys from Tabby\n";
echo "   4. Update with live keys and set Test Mode to OFF\n";
echo "\n🔗 Test your integration at: https://secrets.gatvia.com/checkout\n";



