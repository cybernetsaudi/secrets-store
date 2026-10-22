<?php
/**
 * Re-link orphaned product image files on disk to product_images table.
 * Uses the newest upload file per product ID when that product has no DB images.
 *
 * WARNING: Do not run after purge if you want collection placeholders — this
 * re-attaches legacy files still present under uploads/products/.
 *
 * Usage: php scripts/repair_product_images.php [--dry-run]
 */

require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Core\Database;
use App\Models\ProductImage;

if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

$dryRun = in_array('--dry-run', $argv ?? [], true);
$uploadDir = realpath(__DIR__ . '/../uploads/products');

if (!$uploadDir || !is_dir($uploadDir)) {
    fwrite(STDERR, "Upload directory not found.\n");
    exit(1);
}

$files = glob($uploadDir . '/product_*_*.*') ?: [];
$byProduct = [];

foreach ($files as $path) {
    $basename = basename($path);
    if (!preg_match('/^product_(\d+)_(\d+)_/', $basename, $m)) {
        continue;
    }
    $productId = (int) $m[1];
    $mtime = filemtime($path) ?: 0;
    if (!isset($byProduct[$productId]) || $mtime > $byProduct[$productId]['mtime']) {
        $byProduct[$productId] = [
            'mtime' => $mtime,
            'url' => '/api/uploads/products/' . $basename,
            'path' => $path,
        ];
    }
}

$repaired = 0;
$db = Database::getInstance();

foreach ($byProduct as $productId => $info) {
    $productCheck = $db->prepare('SELECT id FROM products WHERE id = ? LIMIT 1');
    $productCheck->execute([$productId]);
    if (!$productCheck->fetch()) {
        continue;
    }

    $existing = ProductImage::getByProductId($productId);
    if (!empty($existing)) {
        continue;
    }

    echo ($dryRun ? '[dry-run] ' : '') . "Product {$productId}: {$info['url']}\n";

    if (!$dryRun) {
        ProductImage::create([
            'product_id' => $productId,
            'image' => $info['url'],
            'alt_text' => 'Product ' . $productId,
            'is_primary' => 1,
            'display_order' => 0,
        ]);
    }
    $repaired++;
}

echo "Done. " . ($dryRun ? 'Would repair' : 'Repaired') . " {$repaired} product(s).\n";
