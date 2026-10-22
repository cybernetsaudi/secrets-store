<?php
/**
 * Idempotent migration for apparel variant columns.
 * Usage: php scripts/migrate_variant_dimensions.php
 */

require __DIR__ . '/../vendor/autoload.php';

use App\Migrations\VariantDimensionsMigration;
use Dotenv\Dotenv;

if (file_exists(__DIR__ . '/../.env')) {
    Dotenv::createImmutable(__DIR__ . '/..')->safeLoad();
}

$result = VariantDimensionsMigration::run();
echo $result['output'] . PHP_EOL;
if (!$result['success']) {
    fwrite(STDERR, ($result['error'] ?? 'Migration failed') . PHP_EOL);
    exit(1);
}
exit(0);
