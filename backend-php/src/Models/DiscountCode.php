<?php

namespace App\Models;

use App\Core\Database;

class DiscountCode
{
    public static function findByCode(string $code): ?array
    {
        $stmt = Database::query("SELECT * FROM discount_codes WHERE code = ?", [strtoupper($code)]);
        return $stmt->fetch() ?: null;
    }
    
    public static function isValid(array $code): bool
    {
        if (!$code['is_active']) {
            return false;
        }
        
        if ($code['usage_limit'] && $code['used_count'] >= $code['usage_limit']) {
            return false;
        }
        
        $now = date('Y-m-d H:i:s');
        if ($code['valid_from'] && $now < $code['valid_from']) {
            return false;
        }
        
        if ($code['valid_to'] && $now > $code['valid_to']) {
            return false;
        }
        
        return true;
    }
    
    public static function calculateDiscount(array $code, float $amount): float
    {
        if (!self::isValid($code)) {
            return 0;
        }
        
        if ($code['min_purchase'] && $amount < floatval($code['min_purchase'])) {
            return 0;
        }
        
        if ($code['discount_type'] === 'percentage') {
            $discount = $amount * (floatval($code['discount_value']) / 100);
            if ($code['max_discount']) {
                $discount = min($discount, floatval($code['max_discount']));
            }
        } else {
            $discount = min(floatval($code['discount_value']), $amount);
        }
        
        return $discount;
    }
    
    public static function incrementUsage(int $id): void
    {
        Database::query(
            "UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?",
            [$id]
        );
    }
    
    /**
     * Find discount code by ID (for admin)
     */
    public static function find(int $id): ?array
    {
        $stmt = Database::query("SELECT * FROM discount_codes WHERE id = ?", [$id]);
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Create discount code (for admin)
     */
    public static function create(array $data): array
    {
        Database::query(
            "INSERT INTO discount_codes 
             (code, discount_type, discount_value, max_discount, min_purchase, usage_limit, valid_from, valid_to, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                strtoupper(trim($data['code'])),
                $data['discount_type'],
                $data['discount_value'],
                $data['max_discount'] ?? null,
                $data['min_purchase'] ?? null,
                $data['usage_limit'] ?? null,
                $data['valid_from'] ?? null,
                $data['valid_to'] ?? null,
                ($data['is_active'] ?? true) ? 1 : 0,
            ]
        );
        
        $id = Database::getInstance()->lastInsertId();
        return self::find($id) ?: [];
    }
    
    /**
     * Update discount code (for admin)
     */
    public static function update(int $id, array $data): array
    {
        $updates = [];
        $params = [];
        
        if (isset($data['code'])) {
            $updates[] = "code = ?";
            $params[] = strtoupper(trim($data['code']));
        }
        if (isset($data['discount_type'])) {
            $updates[] = "discount_type = ?";
            $params[] = $data['discount_type'];
        }
        if (isset($data['discount_value'])) {
            $updates[] = "discount_value = ?";
            $params[] = $data['discount_value'];
        }
        if (isset($data['max_discount'])) {
            $updates[] = "max_discount = ?";
            $params[] = $data['max_discount'];
        }
        if (isset($data['min_purchase'])) {
            $updates[] = "min_purchase = ?";
            $params[] = $data['min_purchase'];
        }
        if (isset($data['usage_limit'])) {
            $updates[] = "usage_limit = ?";
            $params[] = $data['usage_limit'];
        }
        if (isset($data['valid_from'])) {
            $updates[] = "valid_from = ?";
            $params[] = $data['valid_from'];
        }
        if (isset($data['valid_to'])) {
            $updates[] = "valid_to = ?";
            $params[] = $data['valid_to'];
        }
        if (isset($data['is_active'])) {
            $updates[] = "is_active = ?";
            $params[] = $data['is_active'] ? 1 : 0;
        }
        
        if (!empty($updates)) {
            $params[] = $id;
            Database::query(
                "UPDATE discount_codes SET " . implode(', ', $updates) . " WHERE id = ?",
                $params
            );
        }
        
        return self::find($id) ?: [];
    }
    
    /**
     * Delete discount code (for admin)
     */
    public static function delete(int $id): void
    {
        Database::query("DELETE FROM discount_codes WHERE id = ?", [$id]);
    }
}

