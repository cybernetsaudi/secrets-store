<?php

namespace App\Controllers;

use App\Models\PaymentGateway;

/**
 * Admin Payment Gateway Controller
 * Handles CRUD operations for payment gateway configurations
 */
class AdminPaymentGatewayController
{
    /**
     * Get all payment gateways
     */
    public function index(): array
    {
        \App\Core\Auth::requireAuth();
        
        $gateways = PaymentGateway::all();
        // Don't expose sensitive data in list view
        foreach ($gateways as &$gateway) {
            // Parse config if it's JSON
            if (isset($gateway['config']) && is_string($gateway['config'])) {
                $config = json_decode($gateway['config'], true);
                if (is_array($config)) {
                    $gateway = array_merge($gateway, $config);
                }
            }
            
            // Mask sensitive fields
            if (!empty($gateway['api_key'])) {
                $gateway['api_key'] = substr($gateway['api_key'], 0, 8) . '***';
            }
            if (!empty($gateway['api_secret'])) {
                $gateway['api_secret'] = substr($gateway['api_secret'], 0, 8) . '***';
            }
            if (!empty($gateway['webhook_secret'])) {
                $gateway['webhook_secret'] = substr($gateway['webhook_secret'], 0, 8) . '***';
            }
            
            // Convert is_active and is_test_mode to boolean
            $gateway['is_active'] = (bool)($gateway['is_active'] ?? false);
            $gateway['is_test_mode'] = (bool)($gateway['is_test_mode'] ?? false);
        }
        return ['results' => $gateways];
    }

    /**
     * Get single payment gateway
     */
    public function show(string $id): array
    {
        \App\Core\Auth::requireAuth();
        
        $gateway = PaymentGateway::find((int)$id);
        if (!$gateway) {
            http_response_code(404);
            return ['error' => 'Payment gateway not found'];
        }
        
        // Parse config if it's JSON
        if (isset($gateway['config']) && is_string($gateway['config'])) {
            $config = json_decode($gateway['config'], true);
            if (is_array($config)) {
                $gateway = array_merge($gateway, $config);
            }
        }
        
        // Convert to boolean
        $gateway['is_active'] = (bool)($gateway['is_active'] ?? false);
        $gateway['is_test_mode'] = (bool)($gateway['is_test_mode'] ?? false);
        
        return $gateway;
    }

    /**
     * Create new payment gateway
     */
    public function store(): array
    {
        \App\Core\Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['gateway_name']) || empty($data['gateway_type'])) {
            http_response_code(400);
            return ['error' => 'Gateway name and type are required'];
        }

        try {
            $gateway = PaymentGateway::create($data);
            $gateway['is_active'] = (bool)($gateway['is_active'] ?? false);
            $gateway['is_test_mode'] = (bool)($gateway['is_test_mode'] ?? false);
            return $gateway;
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to create payment gateway: ' . $e->getMessage()];
        }
    }

    /**
     * Update payment gateway
     */
    public function update(string $id): array
    {
        \App\Core\Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);

        $gateway = PaymentGateway::find((int)$id);
        if (!$gateway) {
            http_response_code(404);
            return ['error' => 'Payment gateway not found'];
        }

        try {
            PaymentGateway::update((int)$id, $data);
            $updated = PaymentGateway::find((int)$id);
            
            // Parse config if it's JSON
            if (isset($updated['config']) && is_string($updated['config'])) {
                $config = json_decode($updated['config'], true);
                if (is_array($config)) {
                    $updated = array_merge($updated, $config);
                }
            }
            
            // Convert to boolean
            $updated['is_active'] = (bool)($updated['is_active'] ?? false);
            $updated['is_test_mode'] = (bool)($updated['is_test_mode'] ?? false);
            
            return $updated;
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to update payment gateway: ' . $e->getMessage()];
        }
    }

    /**
     * Delete payment gateway
     */
    public function destroy(string $id): array
    {
        \App\Core\Auth::requireAuth();
        
        $gateway = PaymentGateway::find((int)$id);
        if (!$gateway) {
            http_response_code(404);
            return ['error' => 'Payment gateway not found'];
        }

        try {
            PaymentGateway::delete((int)$id);
            return ['success' => true];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to delete payment gateway: ' . $e->getMessage()];
        }
    }
}

