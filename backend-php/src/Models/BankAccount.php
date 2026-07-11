<?php

namespace App\Models;

use App\Core\Database;

/**
 * Bank Account Model
 * Handles CRUD operations for bank accounts
 */
class BankAccount
{
    /**
     * Get all bank accounts for a gateway
     */
    public static function getByGateway(int $gatewayId): array
    {
        $stmt = Database::query(
            "SELECT * FROM bank_accounts WHERE gateway_id = ? AND is_active = 1 ORDER BY display_order, id",
            [$gatewayId]
        );
        return $stmt->fetchAll();
    }

    /**
     * Get all bank accounts for a gateway (admin - includes inactive)
     */
    public static function getByGatewayAdmin(int $gatewayId): array
    {
        $stmt = Database::query(
            "SELECT * FROM bank_accounts WHERE gateway_id = ? ORDER BY display_order, id",
            [$gatewayId]
        );
        return $stmt->fetchAll();
    }

    /**
     * Find bank account by ID
     */
    public static function find(int $id): ?array
    {
        $stmt = Database::query("SELECT * FROM bank_accounts WHERE id = ?", [$id]);
        return $stmt->fetch() ?: null;
    }

    /**
     * Create new bank account
     */
    public static function create(array $data): array
    {
        try {
            // Check if staff_email column exists, if not, don't include it
            $hasStaffEmail = self::columnExists('staff_email');
            
            // Prepare data with proper type casting
            $insertData = [
                'gateway_id' => (int)$data['gateway_id'],
                'account_name' => (string)$data['account_name'],
                'bank_name' => (string)$data['bank_name'],
                'account_number' => (string)$data['account_number'],
                'iban' => !empty($data['iban']) ? (string)$data['iban'] : null,
                'swift_code' => !empty($data['swift_code']) ? (string)$data['swift_code'] : null,
                'branch' => !empty($data['branch']) ? (string)$data['branch'] : null,
                'address' => !empty($data['address']) ? (string)$data['address'] : null,
                'is_active' => isset($data['is_active']) ? ((bool)$data['is_active'] ? 1 : 0) : 1,
                'display_order' => isset($data['display_order']) ? (int)$data['display_order'] : 0,
            ];
            
            if ($hasStaffEmail) {
                $insertData['staff_email'] = !empty($data['staff_email']) ? (string)$data['staff_email'] : null;
                
                Database::query(
                    "INSERT INTO bank_accounts (
                        gateway_id, account_name, bank_name, account_number, 
                        iban, swift_code, branch, address, staff_email, is_active, display_order
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        $insertData['gateway_id'],
                        $insertData['account_name'],
                        $insertData['bank_name'],
                        $insertData['account_number'],
                        $insertData['iban'],
                        $insertData['swift_code'],
                        $insertData['branch'],
                        $insertData['address'],
                        $insertData['staff_email'],
                        $insertData['is_active'],
                        $insertData['display_order'],
                    ]
                );
            } else {
                Database::query(
                    "INSERT INTO bank_accounts (
                        gateway_id, account_name, bank_name, account_number, 
                        iban, swift_code, branch, address, is_active, display_order
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                        $insertData['gateway_id'],
                        $insertData['account_name'],
                        $insertData['bank_name'],
                        $insertData['account_number'],
                        $insertData['iban'],
                        $insertData['swift_code'],
                        $insertData['branch'],
                        $insertData['address'],
                        $insertData['is_active'],
                        $insertData['display_order'],
                    ]
                );
            }

            $id = Database::getInstance()->lastInsertId();
            if (!$id) {
                error_log("BankAccount::create - No ID returned from insert");
                return [];
            }
            
            $account = self::find($id);
            if (!$account) {
                error_log("BankAccount::create - Could not find account with ID: " . $id);
                return [];
            }
            return $account;
        } catch (\PDOException $e) {
            error_log("BankAccount::create PDO error: " . $e->getMessage());
            error_log("BankAccount::create SQL State: " . $e->getCode());
            throw $e; // Re-throw so controller can handle it
        } catch (\Exception $e) {
            error_log("BankAccount::create error: " . $e->getMessage());
            error_log("BankAccount::create trace: " . $e->getTraceAsString());
            throw $e; // Re-throw so controller can handle it
        }
    }
    
    /**
     * Check if a column exists in the bank_accounts table
     * Uses a static cache to avoid repeated queries
     */
    private static array $columnCache = [];
    
    private static function columnExists(string $columnName): bool
    {
        // Check cache first
        if (isset(self::$columnCache[$columnName])) {
            return self::$columnCache[$columnName];
        }
        
        try {
            $db = Database::getInstance();
            // Use DESCRIBE - it returns array of arrays with 'Field' as key
            $stmt = $db->query("DESCRIBE bank_accounts");
            $columns = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            // Extract column names from the result
            $columnNames = array_column($columns, 'Field');
            
            $exists = in_array($columnName, $columnNames);
            self::$columnCache[$columnName] = $exists;
            
            error_log("BankAccount::columnExists - Column '{$columnName}' " . ($exists ? 'exists' : 'does not exist'));
            error_log("BankAccount::columnExists - Available columns: " . implode(', ', $columnNames));
            
            return $exists;
        } catch (\Exception $e) {
            error_log("BankAccount::columnExists error: " . $e->getMessage());
            error_log("BankAccount::columnExists trace: " . $e->getTraceAsString());
            // If we can't check, assume column doesn't exist to be safe
            self::$columnCache[$columnName] = false;
            return false;
        }
    }

    /**
     * Update bank account
     */
    public static function update(int $id, array $data): array
    {
        try {
            $updates = [];
            $params = [];

            // Check if staff_email column exists
            $hasStaffEmail = self::columnExists('staff_email');
            
            $allowedFields = ['account_name', 'bank_name', 'account_number', 'iban', 'swift_code', 'branch', 'address', 'is_active', 'display_order'];
            if ($hasStaffEmail) {
                $allowedFields[] = 'staff_email';
            }

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updates[] = "$field = ?";
                    if ($field === 'is_active') {
                        $params[] = $data[$field] ? 1 : 0;
                    } else {
                        $params[] = $data[$field] ?? null;
                    }
                }
            }

            if (empty($updates)) {
                // No updates to make, return current account
                return self::find($id) ?: [];
            }

            $params[] = $id;
            Database::query(
                "UPDATE bank_accounts SET " . implode(', ', $updates) . " WHERE id = ?",
                $params
            );

            $updated = self::find($id);
            if (!$updated) {
                return [];
            }

            return $updated;
        } catch (\Exception $e) {
            error_log("BankAccount::update error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Delete bank account
     */
    public static function delete(int $id): bool
    {
        Database::query("DELETE FROM bank_accounts WHERE id = ?", [$id]);
        return true;
    }
}

