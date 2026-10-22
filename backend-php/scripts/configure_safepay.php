<?php
/**
 * Configure Safepay gateway keys in the database.
 * Usage: php scripts/configure_safepay.php
 *
 * Keys can be passed via environment variables (recommended):
 *   SAFEPAY_PUBLIC_KEY=sec_... SAFEPAY_SECRET_KEY=... php scripts/configure_safepay.php
 */
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use Dotenv\Dotenv;

$envPath = __DIR__ . '/..';
if (file_exists($envPath . '/.env')) {
    Dotenv::createImmutable($envPath)->safeLoad();
}

$publicKey = getenv('SAFEPAY_PUBLIC_KEY') ?: '';
$secretKey = getenv('SAFEPAY_SECRET_KEY') ?: '';
$testMode = getenv('SAFEPAY_TEST_MODE') !== '0' ? 1 : 0;

if ($publicKey === '' || $secretKey === '') {
    fwrite(STDERR, "Set SAFEPAY_PUBLIC_KEY and SAFEPAY_SECRET_KEY environment variables.\n");
    exit(1);
}

echo "Applying Safepay migration...\n";
$sqlFile = __DIR__ . '/../database/add_safepay_gateway.sql';
if (file_exists($sqlFile)) {
    $sql = file_get_contents($sqlFile);
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        if ($statement === '' || str_starts_with($statement, '--')) {
            continue;
        }
        try {
            Database::query($statement);
        } catch (Throwable $e) {
            echo "  Note: " . $e->getMessage() . "\n";
        }
    }
}

Database::query(
    "UPDATE payment_gateways
     SET public_key = ?, api_secret = ?, is_active = 1, is_test_mode = ?, updated_at = NOW()
     WHERE gateway_type = 'safepay'",
    [$publicKey, $secretKey, $testMode]
);

$existing = Database::query(
    "SELECT id FROM payment_gateways WHERE gateway_type = 'safepay' LIMIT 1"
)->fetch();

if (!$existing) {
    Database::query(
        "INSERT INTO payment_gateways (
            gateway_name, gateway_type, is_active, is_test_mode, public_key, api_secret
         ) VALUES ('Safepay', 'safepay', 1, ?, ?, ?)",
        [$testMode, $publicKey, $secretKey]
    );
}

$row = Database::query(
    "SELECT id, gateway_type, is_active, is_test_mode, LEFT(public_key, 20) AS public_preview
     FROM payment_gateways WHERE gateway_type = 'safepay' LIMIT 1"
)->fetch();

echo "Safepay configured:\n";
echo json_encode($row, JSON_PRETTY_PRINT) . "\n";
