<?php

namespace App\Models;

use App\Core\Database;

/**
 * Abandoned Cart Model
 * Tracks carts that were started but not completed
 */
class AbandonedCart
{
    /**
     * Create or update abandoned cart
     */
    public static function createOrUpdate(array $data): array
    {
        // Check if cart exists for this email/session
        $existing = null;
        if (!empty($data['guest_email'])) {
            $stmt = Database::query(
                "SELECT * FROM abandoned_carts 
                 WHERE guest_email = ? AND recovered = 0 
                 ORDER BY created_at DESC LIMIT 1",
                [$data['guest_email']]
            );
            $existing = $stmt->fetch();
        } elseif (!empty($data['session_id'])) {
            $stmt = Database::query(
                "SELECT * FROM abandoned_carts 
                 WHERE session_id = ? AND recovered = 0 
                 ORDER BY created_at DESC LIMIT 1",
                [$data['session_id']]
            );
            $existing = $stmt->fetch();
        }
        
        if ($existing) {
            // Update existing
            Database::query(
                "UPDATE abandoned_carts SET 
                 cart_data = ?, 
                 subtotal = ?, 
                 currency = ?, 
                 discount_code = ?,
                 guest_name = ?,
                 guest_phone = ?,
                 abandoned_at = NOW(),
                 updated_at = NOW()
                 WHERE id = ?",
                [
                    json_encode($data['cart_data']),
                    $data['subtotal'] ?? 0,
                    $data['currency'] ?? 'PKR',
                    $data['discount_code'] ?? null,
                    $data['guest_name'] ?? null,
                    $data['guest_phone'] ?? null,
                    $existing['id'],
                ]
            );
            return self::find($existing['id']);
        } else {
            // Create new
            Database::query(
                "INSERT INTO abandoned_carts 
                 (guest_email, guest_name, guest_phone, cart_data, subtotal, currency, discount_code, session_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $data['guest_email'] ?? null,
                    $data['guest_name'] ?? null,
                    $data['guest_phone'] ?? null,
                    json_encode($data['cart_data']),
                    $data['subtotal'] ?? 0,
                    $data['currency'] ?? 'PKR',
                    $data['discount_code'] ?? null,
                    $data['session_id'] ?? null,
                ]
            );
            $id = Database::getInstance()->lastInsertId();
            return self::find($id);
        }
    }
    
    /**
     * Find abandoned cart by ID
     */
    public static function find(int $id): ?array
    {
        $stmt = Database::query("SELECT * FROM abandoned_carts WHERE id = ?", [$id]);
        $cart = $stmt->fetch();
        
        if ($cart && $cart['cart_data']) {
            $cart['cart_data'] = json_decode($cart['cart_data'], true);
        }
        
        return $cart ?: null;
    }
    
    /**
     * Get carts that need reminder (abandoned > 6 hours, no reminder sent)
     */
    public static function getCartsNeedingReminder(int $hours = 6): array
    {
        $stmt = Database::query(
            "SELECT * FROM abandoned_carts 
             WHERE recovered = 0 
             AND guest_email IS NOT NULL 
             AND guest_email != ''
             AND (reminder_sent_at IS NULL OR reminder_sent_at < DATE_SUB(NOW(), INTERVAL 24 HOUR))
             AND abandoned_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
             ORDER BY abandoned_at ASC",
            [$hours]
        );
        
        $carts = $stmt->fetchAll();
        foreach ($carts as &$cart) {
            if ($cart['cart_data']) {
                $cart['cart_data'] = json_decode($cart['cart_data'], true);
            }
        }
        
        return $carts;
    }
    
    /**
     * Mark reminder as sent
     */
    public static function markReminderSent(int $id): void
    {
        Database::query(
            "UPDATE abandoned_carts 
             SET reminder_sent_at = NOW(), 
             reminder_count = reminder_count + 1 
             WHERE id = ?",
            [$id]
        );
    }
    
    /**
     * Mark cart as recovered (converted to order)
     */
    public static function markRecovered(int $id): void
    {
        Database::query(
            "UPDATE abandoned_carts 
             SET recovered = 1, recovered_at = NOW() 
             WHERE id = ?",
            [$id]
        );
    }
    
    /**
     * Delete old recovered carts (older than 90 days)
     */
    public static function cleanupOldCarts(int $days = 90): int
    {
        Database::query(
            "DELETE FROM abandoned_carts 
             WHERE recovered = 1 
             AND recovered_at < DATE_SUB(NOW(), INTERVAL ? DAY)",
            [$days]
        );
        return Database::getInstance()->rowCount();
    }
}


