<?php

namespace App\Models;

use App\Core\Database;

class Product
{
    public static function all(?string $search = null): array
    {
        // Check if deleted_at column exists
        $hasDeletedAtColumn = self::columnExists('deleted_at');
        
        // Build query with or without deleted_at filter
        if ($hasDeletedAtColumn) {
            $query = "SELECT * FROM products WHERE is_active = 1 AND (deleted_at IS NULL OR deleted_at = '')";
        } else {
            $query = "SELECT * FROM products WHERE is_active = 1";
        }
        $params = [];
        
        if ($search && trim($search) !== '') {
            $query .= " AND (name LIKE ? OR short_description LIKE ? OR description LIKE ?)";
            $searchTerm = "%{$search}%";
            $params = [$searchTerm, $searchTerm, $searchTerm];
        }
        
        $query .= " ORDER BY created_at DESC";
        
        $stmt = Database::query($query, $params);
        $products = $stmt->fetchAll();
        
        // Load images and variants for each product
        foreach ($products as &$product) {
            $product['images'] = ProductImage::getByProductId($product['id']);
            $product['variants'] = ProductVariant::getByProductId($product['id']);
        }
        
        return $products;
    }
    
    /**
     * Check if a column exists in the products table
     */
    private static function columnExists(string $columnName): bool
    {
        static $columnCache = [];
        
        if (isset($columnCache[$columnName])) {
            return $columnCache[$columnName];
        }
        
        try {
            $db = Database::getInstance();
            $stmt = $db->query("DESCRIBE products");
            $columns = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            $columnNames = array_column($columns, 'Field');
            $exists = in_array($columnName, $columnNames);
            $columnCache[$columnName] = $exists;
            return $exists;
        } catch (\Exception $e) {
            error_log("Product::columnExists error: " . $e->getMessage());
            // If we can't check, assume column doesn't exist to be safe
            $columnCache[$columnName] = false;
            return false;
        }
    }
    
    public static function find(int $id): ?array
    {
        // Check if deleted_at column exists
        $hasDeletedAtColumn = self::columnExists('deleted_at');
        
        // Build query with or without deleted_at filter
        if ($hasDeletedAtColumn) {
            $stmt = Database::query(
                "SELECT * FROM products WHERE id = ? AND is_active = 1 AND (deleted_at IS NULL OR deleted_at = '')",
                [$id]
            );
        } else {
            $stmt = Database::query(
                "SELECT * FROM products WHERE id = ? AND is_active = 1",
                [$id]
            );
        }
        $product = $stmt->fetch();
        
        if ($product) {
            $product['images'] = ProductImage::getByProductId($id);
            $product['variants'] = ProductVariant::getByProductId($id);
        }
        
        return $product ?: null;
    }
    
    public static function findBySlug(string $slug): ?array
    {
        // Check if deleted_at column exists
        $hasDeletedAtColumn = self::columnExists('deleted_at');
        
        // Build query with or without deleted_at filter
        if ($hasDeletedAtColumn) {
            $stmt = Database::query(
                "SELECT * FROM products WHERE slug = ? AND is_active = 1 AND (deleted_at IS NULL OR deleted_at = '')",
                [$slug]
            );
        } else {
            $stmt = Database::query(
                "SELECT * FROM products WHERE slug = ? AND is_active = 1",
                [$slug]
            );
        }
        $product = $stmt->fetch();
        
        if ($product) {
            $product['images'] = ProductImage::getByProductId($product['id']);
            $product['variants'] = ProductVariant::getByProductId($product['id']);
        }
        
        return $product ?: null;
    }
    
    /**
     * Find product by ID (admin - includes inactive)
     */
    public static function findAdmin(int $id): ?array
    {
        $stmt = Database::query(
            "SELECT * FROM products WHERE id = ?",
            [$id]
        );
        $product = $stmt->fetch();
        
        if ($product) {
            // Use admin methods that include inactive variants/images
            $product['images'] = ProductImage::getByProduct($id);
            $product['variants'] = ProductVariant::getByProduct($id);
        }
        
        return $product ?: null;
    }
    
    /**
     * Create new product (for admin)
     */
    public static function create(array $data): array
    {
        $hasCollection = self::columnExists('collection');
        $hasCategory = self::columnExists('product_category');
        $collection = $data['collection'] ?? 'classic';
        $category = $data['product_category'] ?? null;

        if ($hasCollection && $hasCategory) {
            Database::query(
                "INSERT INTO products (name, slug, description, short_description, base_price, currency, is_active, collection, product_category) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $data['name'],
                    $data['slug'],
                    $data['description'],
                    $data['short_description'] ?? null,
                    $data['base_price'],
                    $data['currency'] ?? 'PKR',
                    ($data['is_active'] ?? true) ? 1 : 0,
                    $collection,
                    $category,
                ]
            );
        } elseif ($hasCollection) {
            Database::query(
                "INSERT INTO products (name, slug, description, short_description, base_price, currency, is_active, collection) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $data['name'],
                    $data['slug'],
                    $data['description'],
                    $data['short_description'] ?? null,
                    $data['base_price'],
                    $data['currency'] ?? 'PKR',
                    ($data['is_active'] ?? true) ? 1 : 0,
                    $collection,
                ]
            );
        } else {
            Database::query(
                "INSERT INTO products (name, slug, description, short_description, base_price, currency, is_active) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    $data['name'],
                    $data['slug'],
                    $data['description'],
                    $data['short_description'] ?? null,
                    $data['base_price'],
                    $data['currency'] ?? 'PKR',
                    ($data['is_active'] ?? true) ? 1 : 0,
                ]
            );
        }
        
        $id = Database::getInstance()->lastInsertId();
        return self::findAdmin($id) ?: [];
    }
    
    /**
     * Update product (for admin)
     */
    public static function update(int $id, array $data): array
    {
        $updates = [];
        $params = [];
        
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['slug'])) {
            $updates[] = "slug = ?";
            $params[] = $data['slug'];
        }
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = $data['description'];
        }
        if (isset($data['short_description'])) {
            $updates[] = "short_description = ?";
            $params[] = $data['short_description'];
        }
        if (isset($data['base_price'])) {
            $updates[] = "base_price = ?";
            $params[] = $data['base_price'];
        }
        if (array_key_exists('compare_at_price', $data) && self::columnExists('compare_at_price')) {
            $updates[] = "compare_at_price = ?";
            $params[] = $data['compare_at_price'] !== '' && $data['compare_at_price'] !== null
                ? $data['compare_at_price']
                : null;
        }
        if (isset($data['currency'])) {
            $updates[] = "currency = ?";
            $params[] = $data['currency'];
        }
        if (isset($data['is_active'])) {
            $updates[] = "is_active = ?";
            $params[] = $data['is_active'] ? 1 : 0;
        }
        if (isset($data['collection']) && self::columnExists('collection')) {
            $updates[] = "collection = ?";
            $params[] = $data['collection'];
        }
        if (array_key_exists('product_category', $data) && self::columnExists('product_category')) {
            $updates[] = "product_category = ?";
            $params[] = $data['product_category'] ?: null;
        }
        
        if (!empty($updates)) {
            $params[] = $id;
            Database::query(
                "UPDATE products SET " . implode(', ', $updates) . " WHERE id = ?",
                $params
            );
        }
        
        return self::findAdmin($id) ?: [];
    }
    
    /**
     * Soft delete product (for admin)
     * Uses soft delete (sets deleted_at timestamp) instead of hard delete
     * This preserves order history while allowing products to be "deleted" from admin view
     * Products with orders can be soft-deleted, but not hard-deleted
     */
    public static function delete(int $id): void
    {
        // Check if deleted_at column exists
        $hasDeletedAtColumn = self::columnExists('deleted_at');
        
        // Check if product has been used in any orders
        $stmt = Database::query(
            "SELECT COUNT(*) as order_count FROM order_items WHERE product_id = ?",
            [$id]
        );
        $result = $stmt->fetch();
        $orderCount = intval($result['order_count'] ?? 0);
        
        if ($orderCount > 0 && $hasDeletedAtColumn) {
            // Product has orders AND deleted_at column exists - use soft delete (set deleted_at timestamp)
            // This preserves order history while removing product from admin listings
            Database::query(
                "UPDATE products SET deleted_at = NOW() WHERE id = ?",
                [$id]
            );
        } else if ($orderCount > 0 && !$hasDeletedAtColumn) {
            // Product has orders BUT deleted_at column doesn't exist
            // Cannot delete products with orders if soft delete is not available
            throw new \Exception('Cannot delete product: Product has orders and soft delete is not available. Please add deleted_at column to enable soft delete.');
        } else {
            // Product has no orders - can safely hard delete
            Database::query("DELETE FROM products WHERE id = ?", [$id]);
        }
    }
    
    /**
     * Restore soft-deleted product (for admin)
     */
    public static function restore(int $id): void
    {
        Database::query(
            "UPDATE products SET deleted_at = NULL WHERE id = ?",
            [$id]
        );
    }
}
