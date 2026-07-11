<?php

namespace App\Controllers;

use App\Models\PaymentGateway;

/**
 * Payment Gateway Controller (Public)
 * Provides payment gateway information for frontend
 */
class PaymentGatewayController
{
    /**
     * Get list of active payment gateways for frontend
     * GET /api/payment-gateways
     * Returns non-sensitive fields only.
     */
    public function getActiveGateways(): array
    {
        $stmt = \App\Core\Database::query(
            "SELECT id, gateway_name, gateway_type, is_active, is_test_mode 
             FROM payment_gateways 
             WHERE is_active = 1 
             ORDER BY gateway_name"
        );
        $gateways = $stmt->fetchAll() ?: [];

        foreach ($gateways as &$gateway) {
            $gateway['is_active'] = (bool)($gateway['is_active'] ?? false);
            $gateway['is_test_mode'] = (bool)($gateway['is_test_mode'] ?? false);
        }

        return ['results' => $gateways];
    }

    /**
     * Get bank transfer details (all active bank accounts)
     * GET /api/payment-gateway/bank-transfer
     */
    public function getBankTransferDetails(): array
    {
        // Find bank transfer gateway - don't require it to be active for public access
        $stmt = \App\Core\Database::query(
            "SELECT * FROM payment_gateways WHERE gateway_type = 'bank_transfer' LIMIT 1"
        );
        $gateway = $stmt->fetch();
        
        if (!$gateway) {
            // Return empty response instead of 404 - gateway might not be configured yet
            return [
                'bank_accounts' => [],
                'staff_email' => '',
            ];
        }
        
        // Get all active bank accounts for this gateway
        $bankAccounts = \App\Models\BankAccount::getByGateway($gateway['id']);
        
        // Return bank accounts and staff email
        return [
            'bank_accounts' => $bankAccounts ?: [],
            'staff_email' => $gateway['staff_email'] ?? '',
        ];
    }

    /**
     * Get Stripe publishable key for frontend
     * GET /api/payment-gateway/stripe
     * Returns publishable key (safe to expose publicly)
     */
    public function getStripeDetails(): array
    {
        $stmt = \App\Core\Database::query(
            "SELECT api_key, public_key, is_active, is_test_mode 
             FROM payment_gateways 
             WHERE gateway_type = 'stripe' 
             LIMIT 1"
        );
        $gateway = $stmt->fetch();
        
        if (!$gateway) {
            return [
                'publishable_key' => '',
                'is_active' => false,
                'is_test_mode' => true,
            ];
        }
        
        // Prefer public_key, fallback to api_key (both should be publishable key)
        $publishableKey = !empty($gateway['public_key']) 
            ? $gateway['public_key'] 
            : ($gateway['api_key'] ?? '');
        
        return [
            'publishable_key' => $publishableKey,
            'is_active' => (bool)($gateway['is_active'] ?? false),
            'is_test_mode' => (bool)($gateway['is_test_mode'] ?? false),
        ];
    }

    /**
     * Get Tabby public key and merchant code for frontend (promo messaging)
     * GET /api/payment-gateway/tabby
     * Returns public key and merchant code (safe to expose publicly)
     */
    public function getTabbyDetails(): array
    {
        $stmt = \App\Core\Database::query(
            "SELECT public_key, merchant_id, is_active, is_test_mode, api_secret 
             FROM payment_gateways 
             WHERE gateway_type = 'tabby' 
             LIMIT 1"
        );
        $gateway = $stmt->fetch();
        
        if (!$gateway) {
            return [
                'public_key' => '',
                'merchant_code' => '',
                'is_active' => false,
                'is_test_mode' => true,
                'api_key_prefix' => '',
            ];
        }
        
        // Log configuration for debugging (masked)
        $apiKeyPrefix = !empty($gateway['api_secret']) ? substr($gateway['api_secret'], 0, 15) . '...' : 'NOT SET';
        error_log("Tabby getTabbyDetails: is_test_mode = " . ($gateway['is_test_mode'] ? '1' : '0'));
        error_log("Tabby getTabbyDetails: API Key Prefix = {$apiKeyPrefix}");
        error_log("Tabby getTabbyDetails: Merchant Code = " . ($gateway['merchant_id'] ?: 'NOT SET'));
        
        return [
            'public_key' => $gateway['public_key'] ?? '',
            'merchant_code' => $gateway['merchant_id'] ?? '',
            'is_active' => (bool)($gateway['is_active'] ?? false),
            'is_test_mode' => (bool)($gateway['is_test_mode'] ?? false),
            'api_key_prefix' => $apiKeyPrefix, // For debugging (masked)
        ];
    }

    /**
     * Get Tamara public key for frontend (widgets/promo)
     * GET /api/payment-gateway/tamara
     */
    public function getTamaraDetails(): array
    {
        $stmt = \App\Core\Database::query(
            "SELECT public_key, merchant_id, is_active, is_test_mode 
             FROM payment_gateways 
             WHERE gateway_type = 'tamara' 
             LIMIT 1"
        );
        $gateway = $stmt->fetch();

        if (!$gateway) {
            return [
                'public_key' => '',
                'merchant_id' => '',
                'is_active' => false,
                'is_test_mode' => true,
            ];
        }

        return [
            'public_key' => $gateway['public_key'] ?? '',
            'merchant_id' => $gateway['merchant_id'] ?? '',
            'is_active' => (bool)($gateway['is_active'] ?? false),
            'is_test_mode' => (bool)($gateway['is_test_mode'] ?? false),
        ];
    }
}

