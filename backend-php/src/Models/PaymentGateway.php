<?php

namespace App\Models;

use App\Core\Database;

/**
 * Payment Gateway Model
 * Handles CRUD operations for payment gateway configurations
 */
class PaymentGateway
{
    private static function mergeJsonConfig(array $gateway): array
    {
        foreach (['config', 'additional_config'] as $field) {
            if (!isset($gateway[$field]) || !is_string($gateway[$field]) || $gateway[$field] === '') {
                continue;
            }
            $config = json_decode($gateway[$field], true);
            if (is_array($config)) {
                $gateway = array_merge($gateway, $config);
            }
        }

        return $gateway;
    }

    /**
     * Get all payment gateways
     */
    public static function all(): array
    {
        $stmt = Database::query("SELECT * FROM payment_gateways ORDER BY gateway_name");
        $gateways = $stmt->fetchAll();

        foreach ($gateways as &$gateway) {
            $gateway = self::mergeJsonConfig($gateway);
        }

        return $gateways;
    }

    /**
     * Find payment gateway by ID
     */
    public static function find(int $id): ?array
    {
        $stmt = Database::query("SELECT * FROM payment_gateways WHERE id = ?", [$id]);
        $result = $stmt->fetch();
        
        if ($result) {
            $result = self::mergeJsonConfig($result);
        }

        return $result ?: null;
    }

    /**
     * Find payment gateway by type
     */
    public static function findByType(string $type): ?array
    {
        $stmt = Database::query("SELECT * FROM payment_gateways WHERE gateway_type = ? AND is_active = 1 LIMIT 1", [$type]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    /**
     * Find payment gateway by type regardless of active flag
     * Useful for reading configuration (API keys) even if temporarily inactive.
     */
    public static function findAnyByType(string $type): ?array
    {
        $stmt = Database::query("SELECT * FROM payment_gateways WHERE gateway_type = ? LIMIT 1", [$type]);
        $result = $stmt->fetch();

        if ($result) {
            $result = self::mergeJsonConfig($result);
        }

        return $result ?: null;
    }

    /**
     * Create new payment gateway
     */
    public static function create(array $data): array
    {
        $sql = "INSERT INTO payment_gateways (
            gateway_name, gateway_type, is_active, is_test_mode,
            api_key, api_secret, public_key, webhook_secret, merchant_id, additional_config,
            bank_account_name, bank_name, bank_account_number, bank_iban, bank_swift, bank_branch, bank_address, staff_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $additionalConfig = isset($data['additional_config']) ? json_encode($data['additional_config']) : null;

        Database::query($sql, [
            $data['gateway_name'],
            $data['gateway_type'],
            $data['is_active'] ?? 0,
            $data['is_test_mode'] ?? 1,
            $data['api_key'] ?? null,
            $data['api_secret'] ?? null,
            $data['public_key'] ?? null,
            $data['webhook_secret'] ?? null,
            $data['merchant_id'] ?? null,
            $additionalConfig,
            $data['bank_account_name'] ?? null,
            $data['bank_name'] ?? null,
            $data['bank_account_number'] ?? null,
            $data['bank_iban'] ?? null,
            $data['bank_swift'] ?? null,
            $data['bank_branch'] ?? null,
            $data['bank_address'] ?? null,
            $data['staff_email'] ?? null,
        ]);

        $id = Database::getInstance()->lastInsertId();
        return self::find($id);
    }

    /**
     * Update payment gateway
     */
    public static function update(int $id, array $data): bool
    {
        $fields = [];
        $params = [];

        $allowedFields = ['gateway_name', 'is_active', 'is_test_mode', 'api_key', 'api_secret', 'public_key', 'webhook_secret', 'merchant_id', 'additional_config', 'bank_account_name', 'bank_name', 'bank_account_number', 'bank_iban', 'bank_swift', 'bank_branch', 'bank_address', 'staff_email'];

        foreach ($allowedFields as $field) {
            // Include field if it's set (even if empty string) - allows clearing values
            if (array_key_exists($field, $data)) {
                $fields[] = "$field = ?";
                if ($field === 'additional_config' && is_array($data[$field])) {
                    $params[] = json_encode($data[$field]);
                } else {
                    // Convert empty string to NULL for optional fields, but keep empty strings for required fields
                    $value = $data[$field];
                    // For text fields that can be empty, allow empty strings (they'll be stored as empty string, not NULL)
                    $params[] = ($value === '' && in_array($field, ['api_key', 'api_secret', 'public_key', 'webhook_secret', 'merchant_id'])) ? '' : ($value === '' ? null : $value);
                }
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        $sql = "UPDATE payment_gateways SET " . implode(', ', $fields) . " WHERE id = ?";
        Database::query($sql, $params);
        return true;
    }

    /**
     * Delete payment gateway
     */
    public static function delete(int $id): bool
    {
        Database::query("DELETE FROM payment_gateways WHERE id = ?", [$id]);
        return true;
    }
}

