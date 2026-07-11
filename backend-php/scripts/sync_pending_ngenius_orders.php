<?php
/**
 * Sync pending Network.ae orders against the N-Genius API.
 * Usage: php scripts/sync_pending_ngenius_orders.php [--dry-run]
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Core\Database;
use App\Services\RedirectPaymentVerifier;

if (file_exists(__DIR__ . '/../.env')) {
    Dotenv::createImmutable(__DIR__ . '/..')->load();
}

$dryRun = in_array('--dry-run', $argv ?? [], true);

$stmt = Database::query(
    "SELECT o.* FROM orders o
     INNER JOIN payments p ON p.order_id = o.id AND p.gateway = 'ngenius'
     WHERE o.payment_method = 'ngenius'
       AND o.payment_status = 'pending'
       AND o.status = 'pending'
       AND p.transaction_id IS NOT NULL
       AND p.transaction_id != ''
     ORDER BY o.created_at DESC"
);
$orders = $stmt->fetchAll() ?: [];

$updated = 0;
foreach ($orders as $order) {
    if ($dryRun) {
        echo "[dry-run] Would verify {$order['order_number']}\n";
        continue;
    }
    $before = $order['payment_status'];
    $after = RedirectPaymentVerifier::verifyOrderIfPending($order);
    $afterStatus = $after['payment_status'] ?? $before;
    if ($afterStatus !== $before) {
        echo "{$order['order_number']}: {$before} -> {$afterStatus}\n";
        $updated++;
    }
}

echo "Done. Updated {$updated} order(s).\n";
