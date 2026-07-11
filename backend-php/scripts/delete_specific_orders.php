<?php

/**
 * Script to delete specific orders by order number
 * Usage: php delete_specific_orders.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

// Load .env file
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        $value = trim($value, '\"\'');
        $_ENV[$name] = $value;
        putenv("{$name}={$value}");
    }
}

use App\Core\Database;

// Orders to delete
$orderNumbers = ['GUFC-260105080', 'GUFC-260104028'];

echo "🗑️  Deleting Specific Orders\n";
echo "============================\n\n";

foreach ($orderNumbers as $orderNumber) {
    echo "Processing: {$orderNumber}\n";
    
    // Find order by order number
    $stmt = Database::query("SELECT id FROM orders WHERE order_number = ?", [$orderNumber]);
    $order = $stmt->fetch();
    
    if (!$order) {
        echo "  ❌ Order not found\n\n";
        continue;
    }
    
    $orderId = $order['id'];
    echo "  Found order ID: {$orderId}\n";
    
    try {
        // Start transaction
        Database::getInstance()->beginTransaction();
        
        // 1. Delete payments
        $paymentCount = Database::query("SELECT COUNT(*) as count FROM payments WHERE order_id = ?", [$orderId])->fetch()['count'];
        if ($paymentCount > 0) {
            Database::query("DELETE FROM payments WHERE order_id = ?", [$orderId]);
            echo "  ✅ Deleted {$paymentCount} payment record(s)\n";
        }
        
        // 2. Delete order items
        $itemCount = Database::query("SELECT COUNT(*) as count FROM order_items WHERE order_id = ?", [$orderId])->fetch()['count'];
        if ($itemCount > 0) {
            Database::query("DELETE FROM order_items WHERE order_id = ?", [$orderId]);
            echo "  ✅ Deleted {$itemCount} order item(s)\n";
        }
        
        // 3. Delete order
        Database::query("DELETE FROM orders WHERE id = ?", [$orderId]);
        echo "  ✅ Deleted order\n";
        
        // Commit transaction
        Database::getInstance()->commit();
        
        echo "  ✅ Successfully deleted order {$orderNumber}\n\n";
        
    } catch (\Exception $e) {
        // Rollback on error
        Database::getInstance()->rollBack();
        echo "  ❌ Error deleting order: " . $e->getMessage() . "\n\n";
    }
}

echo "============================\n";
echo "✅ Script completed\n";

