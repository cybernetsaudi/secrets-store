<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\BankAccount;
use App\Models\PaymentGateway;

/**
 * Admin Bank Account Controller
 * Handles CRUD operations for bank accounts
 */
class AdminBankAccountController
{
    /**
     * Get all bank accounts for a gateway
     * GET /api/admin/payment-gateways/{gatewayId}/bank-accounts
     */
    public function index(string $gatewayId): array
    {
        Auth::requireAuth();
        
        $gateway = PaymentGateway::find((int)$gatewayId);
        if (!$gateway || $gateway['gateway_type'] !== 'bank_transfer') {
            http_response_code(404);
            return ['error' => 'Bank transfer gateway not found'];
        }
        
        $accounts = BankAccount::getByGatewayAdmin((int)$gatewayId);
        return ['results' => $accounts];
    }

    /**
     * Get single bank account
     * GET /api/admin/bank-accounts/{id}
     */
    public function show(string $id): array
    {
        Auth::requireAuth();
        
        $account = BankAccount::find((int)$id);
        if (!$account) {
            http_response_code(404);
            return ['error' => 'Bank account not found'];
        }
        
        return $account;
    }

    /**
     * Create new bank account
     * POST /api/admin/payment-gateways/{gatewayId}/bank-accounts
     */
    public function store(string $gatewayId): array
    {
        Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            return ['error' => 'Invalid JSON data'];
        }
        
        $gateway = PaymentGateway::find((int)$gatewayId);
        if (!$gateway || $gateway['gateway_type'] !== 'bank_transfer') {
            http_response_code(404);
            return ['error' => 'Bank transfer gateway not found'];
        }
        
        // Validate required fields
        $required = ['account_name', 'bank_name', 'account_number'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                http_response_code(400);
                return ['error' => "Missing required field: {$field}"];
            }
        }
        
        $data['gateway_id'] = (int)$gatewayId;
        
        try {
            $account = BankAccount::create($data);
            
            if (empty($account)) {
                http_response_code(500);
                return ['error' => 'Failed to create bank account - database error occurred. Check server logs for details.'];
            }
            
            http_response_code(201);
            return $account;
        } catch (\PDOException $e) {
            $errorMsg = $e->getMessage();
            error_log("AdminBankAccountController::store PDO error: " . $errorMsg);
            error_log("AdminBankAccountController::store SQL State: " . $e->getCode());
            http_response_code(500);
            // Return a user-friendly error message
            if (strpos($errorMsg, 'Unknown column') !== false) {
                return ['error' => 'Database schema error. Please contact administrator.'];
            }
            return ['error' => 'Database error: ' . $errorMsg];
        } catch (\Exception $e) {
            $errorMsg = $e->getMessage();
            error_log("AdminBankAccountController::store error: " . $errorMsg);
            error_log("AdminBankAccountController::store trace: " . $e->getTraceAsString());
            http_response_code(500);
            return ['error' => 'Failed to create bank account: ' . $errorMsg];
        }
    }

    /**
     * Update bank account
     * PUT /api/admin/bank-accounts/{id}
     */
    public function update(string $id): array
    {
        Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            return ['error' => 'Invalid JSON data'];
        }
        
        $account = BankAccount::find((int)$id);
        if (!$account) {
            http_response_code(404);
            return ['error' => 'Bank account not found'];
        }
        
        try {
            $updated = BankAccount::update((int)$id, $data);
            if (empty($updated)) {
                http_response_code(500);
                return ['error' => 'Failed to update bank account - database error occurred'];
            }
            
            http_response_code(200);
            return $updated;
        } catch (\Exception $e) {
            error_log("AdminBankAccountController::update error: " . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Failed to update bank account: ' . $e->getMessage()];
        }
    }

    /**
     * Delete bank account
     * DELETE /api/admin/bank-accounts/{id}
     */
    public function destroy(string $id): array
    {
        Auth::requireAuth();
        
        $account = BankAccount::find((int)$id);
        if (!$account) {
            http_response_code(404);
            return ['error' => 'Bank account not found'];
        }
        
        BankAccount::delete((int)$id);
        return ['success' => true, 'message' => 'Bank account deleted'];
    }
}

