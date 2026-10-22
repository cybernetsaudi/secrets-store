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

        $backfilled = self::backfillLegacyColorFromName($db);
        if ($backfilled > 0) {
            $lines[] = "Backfill: set option_color from legacy variant name on {$backfilled} row(s).";
        } else {
            $lines[] = 'Backfill: no legacy color-only rows needed updates.';
        }

        $lines[] = 'Done.';
        return [
            'success' => true,
            'output' => implode("\n", $lines),
        ];
    }

    /**
     * Legacy variants used `name` only (e.g. "black"). Copy into option_color so the storefront picker activates.
     */
    private static function backfillLegacyColorFromName(PDO $db): int
    {
        $stmt = $db->exec(
            "UPDATE product_variants
             SET option_color = TRIM(`name`)
             WHERE (option_color IS NULL OR option_color = '')
               AND (option_size IS NULL OR option_size = '')
               AND (option_cup IS NULL OR option_cup = '')
               AND `name` IS NOT NULL AND TRIM(`name`) != ''"
        );

        return $stmt === false ? 0 : (int) $stmt;
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
