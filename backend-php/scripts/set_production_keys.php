<?php
/**
 * Set Tabby Production Keys
 * Uses the existing Database class from the application
 */

// Change to API directory (scripts is in api/scripts, so go up one level)
chdir(__DIR__ . '/..');

// Load .env file first - try multiple locations
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    $envFile = getcwd() . '/.env';
}
if (!file_exists($envFile)) {
    $envFile = __DIR__ . '/../../.env';
}
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        // Remove quotes if present
        $value = trim($value, '"\'');
        $_ENV[$name] = $value;
        putenv("{$name}={$value}");
    }
}

// Load autoloader
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;

try {
    // Initialize database
    $db = Database::getInstance();
    
    // Production keys
    $apiSecret = 'sk_01956b47-9761-fd31-cb12-6dfbb14b2e93';
    $publicKey = 'pk_01956b47-9761-fd31-cb12-6dfb5b2b4087';
    $merchantId = 'GUFC';
    
    echo "🔄 Updating Tabby production keys...\n\n";
    
    // Update keys
    Database::query(
        "UPDATE payment_gateways 
         SET api_secret = ?, 
             public_key = ?, 
             merchant_id = ?, 
             is_test_mode = 0, 
             is_active = 1, 
             updated_at = NOW() 
         WHERE gateway_type = 'tabby'",
        [$apiSecret, $publicKey, $merchantId]
    );
    
    echo "✅ Keys updated successfully!\n\n";
    
    // Verify
    $stmt = Database::query(
        "SELECT 
            LEFT(api_secret, 35) as api_secret_prefix,
            LEFT(public_key, 35) as public_key_prefix,
            merchant_id,
            is_test_mode,
            is_active,
            updated_at
         FROM payment_gateways 
         WHERE gateway_type = 'tabby'"
    );
    $result = $stmt->fetch();
    
    echo "📊 Verification:\n";
    echo "   API Secret: {$result['api_secret_prefix']}...\n";
    echo "   Public Key: {$result['public_key_prefix']}...\n";
    echo "   Merchant ID: {$result['merchant_id']}\n";
    echo "   is_test_mode: {$result['is_test_mode']} " . ($result['is_test_mode'] ? '(TEST)' : '(LIVE)') . "\n";
    echo "   is_active: {$result['is_active']} " . ($result['is_active'] ? '(ACTIVE)' : '(INACTIVE)') . "\n";
    echo "   Updated: {$result['updated_at']}\n\n";
    
    // Check if keys match
    if ($result['api_secret_prefix'] === substr($apiSecret, 0, 35) && 
        $result['public_key_prefix'] === substr($publicKey, 0, 35) &&
        $result['merchant_id'] === $merchantId &&
        $result['is_test_mode'] == 0 &&
        $result['is_active'] == 1) {
        echo "✅ All values verified and correct!\n";
    } else {
        echo "⚠️  Warning: Some values don't match expected values\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

