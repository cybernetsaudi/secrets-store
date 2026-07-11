<?php

namespace App\Models;

use App\Core\Database;

class ProductImage
{
    public static function getByProductId(int $productId): array
    {
        $stmt = Database::query(
            "SELECT * FROM product_images WHERE product_id = ? ORDER BY display_order, id",
            [$productId]
        );
        return $stmt->fetchAll();
    }
    
    /**
     * Get images by product (admin - includes all images, no active filter)
     * Alias for consistency with ProductVariant::getByProduct
     */
    public static function getByProduct(int $productId): array
    {
        // For admin, we want all images (no is_active filter)
        // getByProductId already returns all images, so this is fine
        return self::getByProductId($productId);
    }
    
    /**
     * Create image (for admin)
     */
    public static function create(array $data): array
    {
        Database::query(
            "INSERT INTO product_images 
             (product_id, image, alt_text, is_primary, display_order) 
             VALUES (?, ?, ?, ?, ?)",
            [
                $data['product_id'],
                $data['image'],
                $data['alt_text'] ?? null,
                ($data['is_primary'] ?? false) ? 1 : 0,
                $data['display_order'] ?? 0,
            ]
        );
        
        $id = Database::getInstance()->lastInsertId();
        $stmt = Database::query("SELECT * FROM product_images WHERE id = ?", [$id]);
        return $stmt->fetch() ?: [];
    }
    
    /**
     * Delete all images for a product (for admin)
     */
    public static function deleteByProduct(int $productId): void
    {
        Database::query("DELETE FROM product_images WHERE product_id = ?", [$productId]);
    }
}

