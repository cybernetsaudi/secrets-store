<?php

namespace App\Migrations;

use App\Core\Database;
use PDO;
use Throwable;

class VariantDimensionsMigration
{
    /**
     * @return array{success: bool, output: string, error?: string}
     */
    public static function run(): array
    {
        $lines = [];

        try {
            $db = Database::getInstance();
        } catch (Throwable $e) {
            return [
                'success' => false,
                'output' => '',
                'error' => 'Database connection failed: ' . $e->getMessage(),
            ];
        }

        $changes = [
            ['products', 'compare_at_price', 'ALTER TABLE `products` ADD COLUMN `compare_at_price` DECIMAL(10,2) DEFAULT NULL AFTER `base_price`'],
            ['product_variants', 'option_color', 'ALTER TABLE `product_variants` ADD COLUMN `option_color` VARCHAR(100) DEFAULT NULL AFTER `name`'],
            ['product_variants', 'option_size', 'ALTER TABLE `product_variants` ADD COLUMN `option_size` VARCHAR(50) DEFAULT NULL AFTER `option_color`'],
            ['product_variants', 'option_cup', 'ALTER TABLE `product_variants` ADD COLUMN `option_cup` VARCHAR(20) DEFAULT NULL AFTER `option_size`'],
            ['product_variants', 'swatch_image', 'ALTER TABLE `product_variants` ADD COLUMN `swatch_image` VARCHAR(255) DEFAULT NULL AFTER `option_cup`'],
        ];

        foreach ($changes as [$table, $column, $ddl]) {
            if (self::columnExists($db, $table, $column)) {
                $lines[] = "Skip: {$table}.{$column} already exists";
                continue;
            }
            try {
                $db->exec($ddl);
                $lines[] = "OK: {$ddl}";
            } catch (Throwable $e) {
                return [
                    'success' => false,
                    'output' => implode("\n", $lines),
                    'error' => "Failed on {$table}.{$column}: " . $e->getMessage(),
                ];
            }
        }

        $lines[] = 'Done.';
        return [
            'success' => true,
            'output' => implode("\n", $lines),
        ];
    }

    private static function columnExists(PDO $db, string $table, string $column): bool
    {
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $stmt->execute([$table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    }
}
