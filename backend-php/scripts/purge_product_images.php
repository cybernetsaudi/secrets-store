<?php
/**
 * Clear product_images rows so the storefront uses collection placeholders.
 * Optionally archive legacy files from uploads/products/.
 *
 * Usage:
 *   php scripts/purge_product_images.php [--dry-run] [--archive-files]
 */

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Core\Database;

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

$dryRun = in_array('--dry-run', $argv ?? [], true);
$archiveFiles = in_array('--archive-files', $argv ?? [], true);

$db = Database::getInstance();
$countStmt = $db->query('SELECT COUNT(*) AS c FROM product_images');
$rowCount = (int) ($countStmt->fetch()['c'] ?? 0);

echo ($dryRun ? '[dry-run] ' : '') . "product_images rows: {$rowCount}\n";

if (!$dryRun && $rowCount > 0) {
    $db->exec('DELETE FROM product_images');
    echo "Cleared product_images table.\n";
} elseif ($dryRun && $rowCount > 0) {
    echo "Would clear product_images table.\n";
}

if ($archiveFiles) {
    $uploadDir = realpath(__DIR__ . '/../uploads/products');
    if (!$uploadDir || !is_dir($uploadDir)) {
        fwrite(STDERR, "Upload directory not found.\n");
        exit(1);
    }

    $archiveDir = $uploadDir . '/_legacy_archived';
    if (!$dryRun && !is_dir($archiveDir)) {
        mkdir($archiveDir, 0755, true);
    }

    $files = glob($uploadDir . '/product_*_*.*') ?: [];
    $moved = 0;

    foreach ($files as $path) {
        $basename = basename($path);
        echo ($dryRun ? '[dry-run] ' : '') . "Archive {$basename}\n";

        if (!$dryRun) {
            $target = $archiveDir . '/' . $basename;
            if (!rename($path, $target)) {
                fwrite(STDERR, "Failed to move {$basename}\n");
            }
        }
        $moved++;
    }

    echo ($dryRun ? 'Would archive' : 'Archived') . " {$moved} file(s).\n";
}

echo "Done. Products without DB images will use collection placeholders.\n";
