<?php

namespace App\Models;

use App\Core\Database;

class ProductVariant
{
    public static function getByProductId(int $productId): array
    {
        $stmt = Database::query(
            "SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY display_order, id",
            [$productId]
        );
        return $stmt->fetchAll();
    }
    
    public static function find(int $id): ?array
    {
        $stmt = Database::query(
            "SELECT * FROM product_variants WHERE id = ? AND is_active = 1",
            [$id]
        );
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Get variants by product (admin - includes inactive)
     */
    public static function getByProduct(int $productId): array
    {
        $stmt = Database::query(
            "SELECT * FROM product_variants WHERE product_id = ? ORDER BY display_order, id",
            [$productId]
        );
        return $stmt->fetchAll();
    }
    
    /**
     * Create variant (for admin)
     */
    public static function create(array $data): array
    {
        Database::query(
            "INSERT INTO product_variants 
             (product_id, name, description, price_modifier, is_active, display_order) 
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $data['product_id'],
                $data['name'],
                $data['description'] ?? null,
                $data['price_modifier'] ?? 0,
                ($data['is_active'] ?? true) ? 1 : 0,
                $data['display_order'] ?? 0,
            ]
        );
        
        $id = Database::getInstance()->lastInsertId();
        return self::find($id) ?: [];
    }
    
    /**
     * Delete all variants for a product (for admin)
     * NOTE: This method is deprecated - use soft-delete (is_active = false) instead
     * to preserve foreign key relationships with order_items
     */
    public static function deleteByProduct(int $productId): void
    {
        Database::query("DELETE FROM product_variants WHERE product_id = ?", [$productId]);
    }
    
    /**
     * Update variant (for admin)
     */
    public static function update(int $id, array $data): array
    {
        $updates = [];
        $params = [];
        
        if (isset($data['name'])) {
            $updates[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = $data['description'];
        }
        if (isset($data['price_modifier'])) {
            $updates[] = "price_modifier = ?";
            $params[] = $data['price_modifier'];
        }
        if (isset($data['is_active'])) {
            $updates[] = "is_active = ?";
            $params[] = $data['is_active'] ? 1 : 0;
        }
        if (isset($data['display_order'])) {
            $updates[] = "display_order = ?";
            $params[] = $data['display_order'];
        }
        
        if (!empty($updates)) {
            $params[] = $id;
            Database::query(
                "UPDATE product_variants SET " . implode(', ', $updates) . " WHERE id = ?",
                $params
            );
        }
        
        // Return variant (including inactive ones for admin)
        $stmt = Database::query("SELECT * FROM product_variants WHERE id = ?", [$id]);
        return $stmt->fetch() ?: [];
    }
}

