<?php
/**
 * Tamara Payment Gateway - Complete Setup
 * Runs migration and configures credentials.
 *
 * Usage: php scripts/setup_tamara.php
 * Or run via: ./scripts/setup_tamara.sh (from project root)
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use App\Models\PaymentGateway;
use Dotenv\Dotenv;

// Load .env (backend-php or project root)
$envPaths = [__DIR__ . '/../.env', __DIR__ . '/../../.env'];
$envLoaded = false;
foreach ($envPaths as $path) {
    if (file_exists($path)) {
        $dotenv = Dotenv::createImmutable(dirname($path));
        $dotenv->load();
        $envLoaded = true;
        break;
    }
}
if (!$envLoaded) {
    die("❌ .env not found. Create backend-php/.env with DB_HOST, DB_NAME, DB_USER, DB_PASSWORD.\n");
}

echo "Tamara Setup Script\n";
echo "==================\n\n";

// Step 0: Database backup (optional)
echo "Step 0: Database backup...\n";
$backupDir = dirname(__DIR__, 2) . '/backups';
if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}
$backupFile = $backupDir . '/gufc_before_tamara_' . date('Ymd_His') . '.sql';
$host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'localhost';
$name = $_ENV['DB_NAME'] ?? getenv('DB_NAME');
$user = $_ENV['DB_USER'] ?? getenv('DB_USER');
$pass = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD');
if ($name && $user && function_exists('shell_exec')) {
    $cmd = sprintf('mysqldump -h %s -u %s -p%s %s 2>/dev/null', escapeshellarg($host), escapeshellarg($user), escapeshellarg($pass), escapeshellarg($name));
    $out = @shell_exec($cmd);
    if ($out && file_put_contents($backupFile, $out)) {
        echo "   ✓ Backup saved: $backupFile\n";
    } else {
        echo "   ⚠ Backup skipped\n";
    }
} else {
    echo "   ⚠ Backup skipped (run mysqldump manually if needed)\n";
}
echo "\n";

// Connect to database
try {
    $pdo = Database::getInstance();
    echo "✅ Database connected\n\n";
} catch (Exception $e) {
    die("❌ Database connection failed: " . $e->getMessage() . "\n");
}

// Step 1: Run migration - extend enum and insert Tamara gateway
echo "Step 1: Running migration...\n";

try {
    // Extend gateway_type enum
    $pdo->exec("ALTER TABLE payment_gateways 
        MODIFY COLUMN gateway_type enum('stripe','tabby','bank_transfer','apple_pay','tamara','custom') NOT NULL");
    echo "   ✓ Extended gateway_type enum\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate') !== false || strpos($e->getMessage(), '1060') !== false) {
        echo "   ℹ Enum already includes 'tamara'\n";
    } else {
        throw $e;
    }
}

try {
    $stmt = $pdo->prepare("INSERT INTO payment_gateways 
        (gateway_name, gateway_type, is_active, is_test_mode, api_key, api_secret, public_key, webhook_secret, merchant_id) 
        VALUES ('Tamara', 'tamara', 0, 0, NULL, NULL, NULL, NULL, NULL)
        ON DUPLICATE KEY UPDATE gateway_name = 'Tamara'");
    $stmt->execute();
    echo "   ✓ Tamara gateway row ready\n";
} catch (PDOException $e) {
    // May fail if gateway_type not in enum - try alternative
    $check = $pdo->query("SELECT id FROM payment_gateways WHERE gateway_type = 'tamara' LIMIT 1")->fetch();
    if ($check) {
        echo "   ✓ Tamara gateway already exists\n";
    } else {
        throw $e;
    }
}

echo "\n";

// Step 2: Configure credentials
echo "Step 2: Configuring Tamara credentials...\n";

$tamaraConfig = [
    'api_secret'    => 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhY2NvdW50SWQiOiIyODQ3OGQzMS03N2U4LTQ4M2EtYTAwNC1jZjYwY2VmMmUwMDIiLCJ0eXBlIjoibWVyY2hhbnQiLCJzYWx0IjoiOGIyODZiM2UtYjYyYy00OTFjLWEwYTEtZmE1NGI4NjNmZmNlIiwicm9sZXMiOlsiUk9MRV9NRVJDSEFOVCJdLCJpc010bHMiOmZhbHNlLCJpYXQiOjE3NzE5MjI5MDUsImlzcyI6IlRhbWFyYSBQUCJ9.l-YW2tc_8M4Do1R8wN0oTJ6Jj7uuL_31rOPIXlxG9pk5OGUJO9k0VUNb34cXcn7PqN0EpymE6Jy8dt6Fv0E8sH7_Ehxmrb8vcIGf4AHvsc5WNmPBi8lQDhKjyYKkUiaTqNgTN6X5UHNofOf3CGUGEFcC39Koof9b_rd9YFxAAXxPw6uTxd6iUBhm_3YaowbNKDWK31SIYyMQXb9IE__HrC3rJksOosguEedCjAeUnGHOKSphbqiesCGsc2i1jHmE06QHyhJSRLtCCxi9bKCqrm3AZdzyD6ZMZf2GZDGIf-CWTd579TeMu5WfMsoL1qCA1w8srnjrtUA1ycPn-N8ucg',
    'merchant_id'   => '28478d31-77e8-483a-a004-cf60cef2e002',
    'public_key'    => 'f39fae89-df91-4eb7-9b87-5349425c66b2',
    'webhook_secret'=> '1c99b612-3997-4e21-a76a-cde8a23df850',
    'is_test_mode'  => 0,  // Production (api.tamara.co)
    'is_active'     => 1,
];

$gateway = PaymentGateway::findAnyByType('tamara');

if (!$gateway) {
    die("❌ Tamara gateway not found after migration. Check database.\n");
}

$updated = PaymentGateway::update($gateway['id'], $tamaraConfig);

if (!$updated) {
    die("❌ Failed to update Tamara credentials\n");
}

echo "   ✓ Merchant ID: " . $tamaraConfig['merchant_id'] . "\n";
echo "   ✓ API Token: " . substr($tamaraConfig['api_secret'], 0, 50) . "...\n";
echo "   ✓ Public Key: " . $tamaraConfig['public_key'] . "\n";
echo "   ✓ Notification Token: " . substr($tamaraConfig['webhook_secret'], 0, 8) . "***\n";
echo "   ✓ Mode: Production (is_test_mode=0)\n";
echo "   ✓ Active: Yes\n";

// Verify
$verified = PaymentGateway::find($gateway['id']);
echo "\n✅ Verification:\n";
echo "   - Active: " . ($verified['is_active'] ? 'Yes' : 'No') . "\n";
echo "   - Test Mode: " . ($verified['is_test_mode'] ? 'ON' : 'OFF (Production)') . "\n";
echo "   - Merchant ID: " . ($verified['merchant_id'] ?? 'NOT SET') . "\n";
echo "   - API Secret: " . (empty($verified['api_secret']) ? 'NOT SET' : 'SET (' . substr($verified['api_secret'], 0, 30) . '...)') . "\n";

echo "\n🎉 Tamara setup complete!\n";
