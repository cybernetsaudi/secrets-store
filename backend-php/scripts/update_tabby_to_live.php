<?php
/**
 * Script to Update Tabby Configuration to Live Mode
 * 
 * This script:
 * 1. Sets is_test_mode = 0
 * 2. Verifies live keys are present
 * 3. Reports current configuration
 * 
 * Usage: php scripts/update_tabby_to_live.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

use App\Core\Database;

// Initialize database connection
Database::getInstance();

echo "🔍 Tabby Live Mode Configuration Update\n";
echo "=====================================\n\n";

// Get current configuration
$stmt = Database::query(
    "SELECT 
        id,
        gateway_type,
        is_test_mode,
        is_active,
        LEFT(api_secret, 15) as api_secret_prefix,
        LEFT(public_key, 15) as public_key_prefix,
        merchant_id,
        updated_at
     FROM payment_gateways 
     WHERE gateway_type = 'tabby' 
     LIMIT 1"
);
$current = $stmt->fetch();

if (!$current) {
    echo "❌ ERROR: Tabby gateway not found in database!\n";
    exit(1);
}

echo "📊 Current Configuration:\n";
echo "   - ID: {$current['id']}\n";
echo "   - is_test_mode: " . ($current['is_test_mode'] ? '1 (TEST)' : '0 (LIVE)') . "\n";
echo "   - is_active: " . ($current['is_active'] ? '1 (ACTIVE)' : '0 (INACTIVE)') . "\n";
echo "   - API Secret Prefix: {$current['api_secret_prefix']}...\n";
echo "   - Public Key Prefix: {$current['public_key_prefix']}...\n";
echo "   - Merchant ID: " . ($current['merchant_id'] ?: 'NOT SET') . "\n";
echo "   - Last Updated: " . ($current['updated_at'] ?: 'N/A') . "\n\n";

// Check if keys look like live keys
$apiSecretIsLive = strpos($current['api_secret_prefix'], 'sk_live_') === 0;
$publicKeyIsLive = strpos($current['public_key_prefix'], 'pk_live_') === 0;

echo "🔑 Key Type Analysis:\n";
echo "   - API Secret Type: " . ($apiSecretIsLive ? '✅ LIVE (sk_live_)' : ($current['api_secret_prefix'] ? '⚠️  NOT LIVE (expected sk_live_)' : '❌ NOT SET')) . "\n";
echo "   - Public Key Type: " . ($publicKeyIsLive ? '✅ LIVE (pk_live_)' : ($current['public_key_prefix'] ? '⚠️  NOT LIVE (expected pk_live_)' : '❌ NOT SET')) . "\n\n";

// Update is_test_mode to 0
if ($current['is_test_mode'] == 1) {
    echo "🔄 Updating is_test_mode from 1 (TEST) to 0 (LIVE)...\n";
    
    Database::query(
        "UPDATE payment_gateways 
         SET is_test_mode = 0, updated_at = NOW() 
         WHERE id = ?",
        [$current['id']]
    );
    
    echo "✅ Updated is_test_mode to 0 (LIVE)\n\n";
} else {
    echo "ℹ️  is_test_mode is already set to 0 (LIVE)\n\n";
}

// Verify update
$stmt = Database::query(
    "SELECT is_test_mode, updated_at 
     FROM payment_gateways 
     WHERE id = ?",
    [$current['id']]
);
$updated = $stmt->fetch();

echo "✅ Final Configuration:\n";
echo "   - is_test_mode: " . ($updated['is_test_mode'] ? '1 (TEST)' : '0 (LIVE)') . "\n";
echo "   - Updated At: {$updated['updated_at']}\n\n";

// Warnings
if (!$apiSecretIsLive || !$publicKeyIsLive) {
    echo "⚠️  WARNING: Keys do not appear to be live keys!\n";
    echo "   Please verify that you have entered LIVE keys (starting with sk_live_ and pk_live_)\n";
    echo "   in the admin panel: /admin/settings/payment-gateways/\n\n";
}

if (!$current['is_active']) {
    echo "⚠️  WARNING: Tabby gateway is INACTIVE (is_active = 0)\n";
    echo "   Please activate it in the admin panel if you want to use Tabby.\n\n";
}

if (empty($current['merchant_id'])) {
    echo "⚠️  WARNING: Merchant ID is not set!\n";
    echo "   Please set the merchant code in the admin panel.\n\n";
}

echo "✅ Configuration update complete!\n";
echo "\n";
echo "📝 Next Steps:\n";
echo "   1. Verify live keys are correct in admin panel\n";
echo "   2. Ensure is_active = 1 if you want Tabby enabled\n";
echo "   3. Test a payment with live keys\n";
echo "   4. Check server logs for detailed API call information\n";

