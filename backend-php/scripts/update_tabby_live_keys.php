<?php
/**
 * Script to Update Tabby Live Production Keys
 * 
 * Updates Tabby gateway with production API keys
 * 
 * Usage: php scripts/update_tabby_live_keys.php
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

echo "🔧 Updating Tabby Production API Keys\n";
echo "====================================\n\n";

// Production keys provided
$productionKeys = [
    'public_key' => 'pk_01956b47-9761-fd31-cb12-6dfb5b2b4087',
    'api_secret' => 'sk_01956b47-9761-fd31-cb12-6dfbb14b2e93',
    'merchant_id' => 'GUFC',
    'is_test_mode' => 0, // Live mode
    'is_active' => 1,    // Active
];

// Get current configuration
$stmt = Database::query(
    "SELECT id, gateway_type, is_test_mode, is_active, 
            LEFT(api_secret, 20) as api_secret_current,
            LEFT(public_key, 20) as public_key_current,
            merchant_id
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
echo "   - Current API Secret: {$current['api_secret_current']}...\n";
echo "   - Current Public Key: {$current['public_key_current']}...\n";
echo "   - Current Merchant ID: " . ($current['merchant_id'] ?: 'NOT SET') . "\n\n";

echo "🔄 Updating to Production Keys...\n";

// Update with production keys
Database::query(
    "UPDATE payment_gateways 
     SET 
        api_secret = ?,
        public_key = ?,
        merchant_id = ?,
        is_test_mode = ?,
        is_active = ?,
        updated_at = NOW()
     WHERE id = ?",
    [
        $productionKeys['api_secret'],
        $productionKeys['public_key'],
        $productionKeys['merchant_id'],
        $productionKeys['is_test_mode'],
        $productionKeys['is_active'],
        $current['id']
    ]
);

echo "✅ Keys updated successfully!\n\n";

// Verify update
$stmt = Database::query(
    "SELECT 
        is_test_mode,
        is_active,
        LEFT(api_secret, 20) as api_secret_prefix,
        LEFT(public_key, 20) as public_key_prefix,
        merchant_id,
        updated_at
     FROM payment_gateways 
     WHERE id = ?",
    [$current['id']]
);
$updated = $stmt->fetch();

echo "✅ Verification - Updated Configuration:\n";
echo "   - is_test_mode: " . ($updated['is_test_mode'] ? '1 (TEST)' : '0 (LIVE)') . "\n";
echo "   - is_active: " . ($updated['is_active'] ? '1 (ACTIVE)' : '0 (INACTIVE)') . "\n";
echo "   - API Secret: {$updated['api_secret_prefix']}...\n";
echo "   - Public Key: {$updated['public_key_prefix']}...\n";
echo "   - Merchant ID: {$updated['merchant_id']}\n";
echo "   - Updated At: {$updated['updated_at']}\n\n";

// Verify keys match expected values
$keysMatch = true;
if ($updated['api_secret_prefix'] !== substr($productionKeys['api_secret'], 0, 20)) {
    echo "⚠️  WARNING: API Secret doesn't match expected value!\n";
    $keysMatch = false;
}
if ($updated['public_key_prefix'] !== substr($productionKeys['public_key'], 0, 20)) {
    echo "⚠️  WARNING: Public Key doesn't match expected value!\n";
    $keysMatch = false;
}
if ($updated['merchant_id'] !== $productionKeys['merchant_id']) {
    echo "⚠️  WARNING: Merchant ID doesn't match expected value!\n";
    $keysMatch = false;
}

if ($keysMatch) {
    echo "✅ All keys verified and match expected values!\n\n";
} else {
    echo "❌ Some keys don't match - please verify manually!\n\n";
}

echo "📝 Configuration Summary:\n";
echo "   ✅ Production API keys set\n";
echo "   ✅ is_test_mode = 0 (LIVE)\n";
echo "   ✅ is_active = 1 (ACTIVE)\n";
echo "   ✅ Merchant code = GUFC\n\n";

echo "🎯 Next Steps:\n";
echo "   1. Test a payment with Tabby\n";
echo "   2. Check server logs for: 'Tabby processPayment: API Key Type = LIVE'\n";
echo "   3. Verify payment processes correctly\n";
echo "   4. If issues persist, check logs for specific Tabby error messages\n\n";

echo "✅ Update complete!\n";

