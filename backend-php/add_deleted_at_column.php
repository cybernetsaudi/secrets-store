<?php
/**
 * Migration Script: Add deleted_at column to products table
 * 
 * This script adds the deleted_at column to enable soft delete functionality
 * for products. Products with orders can be soft-deleted (hidden from admin)
 * while preserving order history.
 * 
 * Usage: php add_deleted_at_column.php
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Core\Database;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

echo "Starting migration: Add deleted_at column to products table...\n";

try {
    $db = Database::getInstance();
    
    // Check if column already exists
    $stmt = $db->query("DESCRIBE products");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_column($columns, 'Field');
    
    if (in_array('deleted_at', $columnNames)) {
        echo "✓ Column 'deleted_at' already exists. Migration not needed.\n";
        exit(0);
    }
    
    echo "Column 'deleted_at' does not exist. Adding it now...\n";
    
    // Add the column
    $db->exec("ALTER TABLE products ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL COMMENT 'Soft delete timestamp - NULL means not deleted'");
    
    echo "✓ Column 'deleted_at' added successfully.\n";
    
    // Add index for faster queries
    try {
        $db->exec("CREATE INDEX idx_products_deleted_at ON products(deleted_at)");
        echo "✓ Index 'idx_products_deleted_at' created successfully.\n";
    } catch (PDOException $e) {
        // Index might already exist, that's okay
        if (strpos($e->getMessage(), 'Duplicate key name') === false) {
            throw $e;
        }
        echo "ℹ Index already exists (this is fine).\n";
    }
    
    echo "\n✓ Migration completed successfully!\n";
    echo "Products with orders can now be soft-deleted.\n";
    
} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}





