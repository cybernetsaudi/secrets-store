<?php
/**
 * Verify Tabby Keys from Database
 * Checks what keys are actually stored and being used
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

use App\Core\Database;

try {
    $db = Database::getInstance();
    
    echo "🔍 Verifying Tabby Configuration from Database\n";
    echo "============================================\n\n";
    
    $stmt = Database::query(
        "SELECT 
            id,
            gateway_name,
            gateway_type,
            is_test_mode,
            is_active,
            LEFT(api_secret, 30) as api_secret_prefix,
            LEFT(public_key, 30) as public_key_prefix,
            merchant_id,
            updated_at
         FROM payment_gateways 
         WHERE gateway_type = 'tabby' 
         LIMIT 1"
    );
    $config = $stmt->fetch();
    
    if (!$config) {
        echo "❌ ERROR: Tabby gateway not found in database!\n";
        exit(1);
    }
    
    echo "📊 Database Configuration:\n";
    echo "   ID: {$config['id']}\n";
    echo "   Gateway Name: {$config['gateway_name']}\n";
    echo "   is_test_mode: {$config['is_test_mode']} " . ($config['is_test_mode'] ? '(TEST)' : '(LIVE)') . "\n";
    echo "   is_active: {$config['is_active']} " . ($config['is_active'] ? '(ACTIVE)' : '(INACTIVE)') . "\n";
    echo "   API Secret Prefix: {$config['api_secret_prefix']}...\n";
    echo "   Public Key Prefix: {$config['public_key_prefix']}...\n";
    echo "   Merchant ID: {$config['merchant_id']}\n";
    echo "   Updated At: {$config['updated_at']}\n\n";
    
    // Get full keys for verification
    $stmt = Database::query(
        "SELECT api_secret, public_key FROM payment_gateways WHERE id = ?",
        [$config['id']]
    );
    $fullKeys = $stmt->fetch();
    
    echo "🔑 Key Verification:\n";
    
    // Expected test keys
    $expectedSecret = 'sk_test_01956b47-9761-fd31-cb12-6dfcacf3c59c';
    $expectedPublic = 'pk_test_01956b47-9761-fd31-cb12-6dfc6adaf5b3';
    $expectedMerchant = 'GUFC';
    
    $secretMatch = ($fullKeys['api_secret'] === $expectedSecret);
    $publicMatch = ($fullKeys['public_key'] === $expectedPublic);
    $merchantMatch = ($config['merchant_id'] === $expectedMerchant);
    
    echo "   API Secret: " . ($secretMatch ? '✅ MATCHES' : '❌ MISMATCH') . "\n";
    if (!$secretMatch) {
        echo "      Expected: {$expectedSecret}\n";
        echo "      Actual:   {$fullKeys['api_secret']}\n";
    }
    
    echo "   Public Key: " . ($publicMatch ? '✅ MATCHES' : '❌ MISMATCH') . "\n";
    if (!$publicMatch) {
        echo "      Expected: {$expectedPublic}\n";
        echo "      Actual:   {$fullKeys['public_key']}\n";
    }
    
    echo "   Merchant ID: " . ($merchantMatch ? '✅ MATCHES' : '❌ MISMATCH') . "\n";
    if (!$merchantMatch) {
        echo "      Expected: {$expectedMerchant}\n";
        echo "      Actual:   {$config['merchant_id']}\n";
    }
    
    echo "\n";
    
    // Test if TabbyAdapter would use these keys
    echo "🧪 Testing TabbyAdapter Key Retrieval:\n";
    try {
        $gateway = \App\Services\PaymentGatewayFactory::getGateway('tabby');
        if ($gateway) {
            // Use reflection to access private method
            $reflection = new ReflectionClass($gateway);
            $getApiKeyMethod = $reflection->getMethod('getApiKey');
            $getApiKeyMethod->setAccessible(true);
            $retrievedApiKey = $getApiKeyMethod->invoke($gateway);
            
            $getMerchantMethod = $reflection->getMethod('getMerchantCode');
            $getMerchantMethod->setAccessible(true);
            $retrievedMerchant = $getMerchantMethod->invoke($gateway);
            
            echo "   Retrieved API Key: " . substr($retrievedApiKey, 0, 30) . "...\n";
            echo "   Retrieved Merchant: {$retrievedMerchant}\n";
            
            $keyMatches = ($retrievedApiKey === $expectedSecret);
            $merchantMatches = ($retrievedMerchant === $expectedMerchant);
            
            echo "   API Key Match: " . ($keyMatches ? '✅ YES' : '❌ NO') . "\n";
            echo "   Merchant Match: " . ($merchantMatches ? '✅ YES' : '❌ NO') . "\n";
        } else {
            echo "   ❌ ERROR: Could not get Tabby gateway instance\n";
        }
    } catch (Exception $e) {
        echo "   ❌ ERROR: " . $e->getMessage() . "\n";
    }
    
    echo "\n";
    
    if ($secretMatch && $publicMatch && $merchantMatch && $config['is_test_mode'] == 1) {
        echo "✅ All keys match expected test keys!\n";
        echo "✅ Test mode is enabled!\n";
        echo "\n";
        echo "🔍 Next: Check server logs when attempting a payment to see what Tabby returns.\n";
    } else {
        echo "⚠️  WARNING: Keys don't match or test mode not enabled!\n";
        echo "   Please verify the keys in admin panel: /admin/settings/payment-gateways/\n";
    }
    
} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

