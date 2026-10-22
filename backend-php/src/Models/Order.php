<?php

namespace App\Models;

use App\Core\Database;

class Order
{
    public static function shippingFromRequest(array $data): array
    {
        return [
            'shipping_address_line1' => trim((string)($data['shipping_address_line1'] ?? '')),
            'shipping_address_line2' => trim((string)($data['shipping_address_line2'] ?? '')) ?: null,
            'shipping_city' => trim((string)($data['shipping_city'] ?? '')),
            'shipping_state' => trim((string)($data['shipping_state'] ?? '')) ?: null,
            'shipping_postal_code' => trim((string)($data['shipping_postal_code'] ?? '')) ?: null,
            'shipping_country' => strtoupper(trim((string)($data['shipping_country'] ?? 'PK'))) ?: 'PK',
        ];
    }

    public static function validateShippingData(array $shipping): ?string
    {
        if ($shipping['shipping_address_line1'] === '') {
            return 'Shipping address is required';
        }
        if ($shipping['shipping_city'] === '') {
            return 'City is required';
        }
        if ($shipping['shipping_country'] === '') {
            return 'Country is required';
        }
        return null;
    }

    public static function formatShippingAddress(array $order): string
    {
        $parts = array_filter([
            $order['shipping_address_line1'] ?? null,
            $order['shipping_address_line2'] ?? null,
            $order['shipping_city'] ?? null,
            $order['shipping_state'] ?? null,
            $order['shipping_postal_code'] ?? null,
            $order['shipping_country'] ?? null,
        ], static fn($value) => $value !== null && $value !== '');

        return implode(', ', $parts);
    }

    private static function enrichOrder(array $order): array
    {
        $line1 = trim((string)($order['shipping_address_line1'] ?? ''));
        $line2 = trim((string)($order['shipping_address_line2'] ?? ''));
        $order['shipping_address'] = $line2 !== '' ? "{$line1}, {$line2}" : $line1;
        $order['shipping_zip'] = $order['shipping_postal_code'] ?? '';
        return $order;
    }

    public static function create(array $data): array
    {
        $orderNumber = self::generateOrderNumber();
        $shipping = self::shippingFromRequest($data);

        Database::query(
            "INSERT INTO orders (
                order_number, guest_name, guest_email, guest_phone,
                shipping_address_line1, shipping_address_line2, shipping_city,
                shipping_state, shipping_postal_code, shipping_country,
                subtotal, discount_amount, discount_code_id, vat_amount, total_amount,
                currency, fx_rate, payment_method, bank_account_id, no_refund_accepted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $orderNumber,
                $data['guest_name'],
                $data['guest_email'],
                $data['guest_phone'],
                $shipping['shipping_address_line1'],
                $shipping['shipping_address_line2'],
                $shipping['shipping_city'],
                $shipping['shipping_state'],
                $shipping['shipping_postal_code'],
                $shipping['shipping_country'],
                $data['subtotal'],
                $data['discount_amount'] ?? 0,
                $data['discount_code_id'] ?? null,
                $data['vat_amount'],
                $data['total_amount'],
                $data['currency'] ?? 'PKR',
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
            $order = self::enrichOrder($order);
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

    public static function updatePaymentStatus(int $id, string $paymentStatus): void
    {
        Database::query(
            "UPDATE orders SET payment_status = ? WHERE id = ?",
            [$paymentStatus, $id]
        );
    }

    public static function findByOrderNumber(string $orderNumber): ?array
    {
        $orderNumber = trim($orderNumber);
        $stmt = Database::query("SELECT * FROM orders WHERE order_number = ?", [$orderNumber]);
        $order = $stmt->fetch();

        if (!$order && preg_match('/^(GUFC|GS)-(.+)$/', $orderNumber, $matches)) {
            $alternate = ($matches[1] === 'GUFC' ? 'GS' : 'GUFC') . '-' . $matches[2];
            $stmt = Database::query("SELECT * FROM orders WHERE order_number = ?", [$alternate]);
            $order = $stmt->fetch();
        }

        if ($order) {
            $order = self::enrichOrder($order);
            $order['items'] = self::getItems($order['id']);
        }

        return $order ?: null;
    }

    public static function delete(int $id): void
    {
        $db = Database::getInstance();
        $db->beginTransaction();

        try {
            Database::query("DELETE FROM order_items WHERE order_id = ?", [$id]);
            Database::query("DELETE FROM payments WHERE order_id = ?", [$id]);
            Database::query("DELETE FROM orders WHERE id = ?", [$id]);
            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    private static function generateOrderNumber(): string
    {
        $prefix = $_ENV['ORDER_NUMBER_PREFIX'] ?? 'GS';
        $datePart = date('ymd');

        $like = "{$prefix}-{$datePart}%";
        $stmt = Database::query(
            "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1",
            [$like]
        );
        $row = $stmt->fetch();

        $seq = 1;
        if ($row && isset($row['order_number'])) {
            $existing = $row['order_number'];
            $suffix = substr($existing, -3);
            if (ctype_digit($suffix)) {
                $seq = (int)$suffix + 1;
            }
        }

        $seqStr = str_pad((string)$seq, 3, '0', STR_PAD_LEFT);
        return "{$prefix}-{$datePart}{$seqStr}";
    }
}
