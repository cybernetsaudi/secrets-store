<?php

namespace App\Models;

use App\Core\Database;

class Order
{
    public static function create(array $data): array
    {
        $orderNumber = self::generateOrderNumber();
        
        Database::query(
            "INSERT INTO orders (
                order_number, guest_name, guest_email, guest_phone,
                player_name, player_date_of_birth, trial_coach_name,
                subtotal, discount_amount, discount_code_id, vat_amount, total_amount,
                currency, fx_rate, payment_method, bank_account_id, no_refund_accepted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $orderNumber,
                $data['guest_name'],
                $data['guest_email'],
                $data['guest_phone'],
                $data['player_name'] ?? null,
                $data['player_date_of_birth'] ?? null,
                $data['trial_coach_name'] ?? null,
                $data['subtotal'],
                $data['discount_amount'] ?? 0,
                $data['discount_code_id'] ?? null,
                $data['vat_amount'],
                $data['total_amount'],
                $data['currency'] ?? 'AED',
                $data['fx_rate'] ?? 1.0,
                $data['payment_method'],
                $data['bank_account_id'] ?? null,
                $data['no_refund_accepted'] ? 1 : 0,
            ]
        );
        
        $id = Database::getInstance()->lastInsertId();
        return self::find($id);
    }
    
    public static function find(int $id): ?array
    {
        $stmt = Database::query("SELECT * FROM orders WHERE id = ?", [$id]);
        $order = $stmt->fetch();
        
        if ($order) {
            $order['items'] = self::getItems($id);
        }
        
        return $order ?: null;
    }
    
    public static function getItems(int $orderId): array
    {
        $stmt = Database::query(
            "SELECT oi.*, p.name as product_name, pv.name as variant_name
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             LEFT JOIN product_variants pv ON oi.variant_id = pv.id
             WHERE oi.order_id = ?",
            [$orderId]
        );
        return $stmt->fetchAll();
    }
    
    public static function createItem(array $data): void
    {
        Database::query(
            "INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $data['order_id'],
                $data['product_id'],
                $data['variant_id'] ?? null,
                $data['quantity'],
                $data['unit_price'],
                $data['total_price'],
            ]
        );
    }
    
    public static function updateStatus(int $id, string $status, ?string $paymentStatus = null): void
    {
        if ($paymentStatus) {
            Database::query(
                "UPDATE orders SET status = ?, payment_status = ? WHERE id = ?",
                [$status, $paymentStatus, $id]
            );
        } else {
            Database::query(
                "UPDATE orders SET status = ? WHERE id = ?",
                [$status, $id]
            );
        }
    }
    
    /**
     * Update payment status only
     */
    public static function updatePaymentStatus(int $id, string $paymentStatus): void
    {
        Database::query(
            "UPDATE orders SET payment_status = ? WHERE id = ?",
            [$paymentStatus, $id]
        );
    }
    
    public static function findByOrderNumber(string $orderNumber): ?array
    {
        $stmt = Database::query("SELECT * FROM orders WHERE order_number = ?", [$orderNumber]);
        $order = $stmt->fetch();
        
        if ($order) {
            $order['items'] = self::getItems($order['id']);
        }
        
        return $order ?: null;
    }
    
    /**
     * Delete order and its related data
     * Only safe to delete if order is pending in both status and payment_status
     */
    public static function delete(int $id): void
    {
        // Start transaction
        $db = Database::getInstance();
        $db->beginTransaction();
        
        try {
            // Delete order items first (foreign key constraint)
            Database::query("DELETE FROM order_items WHERE order_id = ?", [$id]);
            
            // Delete payments related to this order
            Database::query("DELETE FROM payments WHERE order_id = ?", [$id]);
            
            // Delete the order
            Database::query("DELETE FROM orders WHERE id = ?", [$id]);
            
            // Commit transaction
            $db->commit();
        } catch (\Exception $e) {
            // Rollback on error
            $db->rollBack();
            throw $e;
        }
    }
    
    private static function generateOrderNumber(): string
    {
        $prefix = $_ENV['ORDER_NUMBER_PREFIX'] ?? 'GUFC';
        $datePart = date('ymd'); // YYMMDD

        // Find last order for today to increment sequence
        $like = "{$prefix}-{$datePart}%";
        $stmt = Database::query(
            "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1",
            [$like]
        );
        $row = $stmt->fetch();

        $seq = 1;
        if ($row && isset($row['order_number'])) {
            $existing = $row['order_number'];
            // Extract last 3 digits
            $suffix = substr($existing, -3);
            if (ctype_digit($suffix)) {
                $seq = (int)$suffix + 1;
            }
        }

        $seqStr = str_pad((string)$seq, 3, '0', STR_PAD_LEFT);
        // Format: GUFC-YYMMDDxxx
        return "{$prefix}-{$datePart}{$seqStr}";
    }
}

