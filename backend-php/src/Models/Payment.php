<?php

namespace App\Models;

use App\Core\Database;

class Payment
{
    public static function create(array $data): array
    {
        Database::query(
            "INSERT INTO payments (order_id, gateway, transaction_id, amount, currency, status, gateway_response)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $data['order_id'],
                $data['gateway'],
                $data['transaction_id'],
                $data['amount'],
                $data['currency'] ?? 'AED',
                $data['status'] ?? 'pending',
                $data['gateway_response'] ?? null,
            ]
        );
        
        $id = Database::getInstance()->lastInsertId();
        return self::find($id);
    }
    
    public static function find(int $id): ?array
    {
        $stmt = Database::query("SELECT * FROM payments WHERE id = ?", [$id]);
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Find payment by transaction ID
     */
    public static function findByTransactionId(string $transactionId): ?array
    {
        $stmt = Database::query("SELECT * FROM payments WHERE transaction_id = ?", [$transactionId]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Find payment by order ID and gateway
     */
    public static function findByOrderAndGateway(int $orderId, string $gateway): ?array
    {
        $stmt = Database::query("SELECT * FROM payments WHERE order_id = ? AND gateway = ? ORDER BY created_at DESC LIMIT 1", [$orderId, $gateway]);
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Update payment status
     */
    public static function updateStatus(string $transactionId, string $status): void
    {
        Database::query(
            "UPDATE payments SET status = ?, updated_at = NOW() WHERE transaction_id = ?",
            [$status, $transactionId]
        );
    }
}


