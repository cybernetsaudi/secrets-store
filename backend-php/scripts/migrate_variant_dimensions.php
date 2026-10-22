<?php
/**
 * Idempotent migration for apparel variant columns.
 * Usage: php scripts/migrate_variant_dimensions.php
 */

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Core\Database;

if (file_exists(__DIR__ . '/../.env')) {
    Dotenv::createImmutable(__DIR__ . '/..')->safeLoad();
}

try {
    $db = Database::getInstance();
} catch (Throwable $e) {
    fwrite(STDERR, 'Database connection failed: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

function columnExists(PDO $db, string $table, string $column): bool
{
    $stmt = $db->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $column]);
    return (int) $stmt->fetchColumn() > 0;
}

function addColumn(PDO $db, string $table, string $ddl): void
{
    $db->exec($ddl);
    echo "OK: {$ddl}\n";
}

$changes = [
    ['products', 'compare_at_price', 'ALTER TABLE `products` ADD COLUMN `compare_at_price` DECIMAL(10,2) DEFAULT NULL AFTER `base_price`'],
    ['product_variants', 'option_color', 'ALTER TABLE `product_variants` ADD COLUMN `option_color` VARCHAR(100) DEFAULT NULL AFTER `name`'],
    ['product_variants', 'option_size', 'ALTER TABLE `product_variants` ADD COLUMN `option_size` VARCHAR(50) DEFAULT NULL AFTER `option_color`'],
    ['product_variants', 'option_cup', 'ALTER TABLE `product_variants` ADD COLUMN `option_cup` VARCHAR(20) DEFAULT NULL AFTER `option_size`'],
    ['product_variants', 'swatch_image', 'ALTER TABLE `product_variants` ADD COLUMN `swatch_image` VARCHAR(255) DEFAULT NULL AFTER `option_cup`'],
];

foreach ($changes as [$table, $column, $ddl]) {
    if (columnExists($db, $table, $column)) {
        echo "Skip: {$table}.{$column} already exists\n";
        continue;
    }
    addColumn($db, $table, $ddl);
}

echo "Done.\n";
