<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\DiscountCode;

/**
 * Admin Discount Code Management Controller
 * CRUD operations for discount codes
 */
class AdminDiscountController
{
    /**
     * List all discount codes
     * GET /api/admin/discounts
     */
    public function index(): array
    {
        Auth::requireAuth();
        
        $stmt = \App\Core\Database::query(
            "SELECT * FROM discount_codes ORDER BY created_at DESC"
        );
        return $stmt->fetchAll();
    }
    
    /**
     * Get single discount code
     * GET /api/admin/discounts/{id}
     */
    public function show(int $id): array
    {
        Auth::requireAuth();
        
        $code = DiscountCode::find($id);
        if (!$code) {
            http_response_code(404);
            return ['error' => 'Discount code not found'];
        }
        
        return $code;
    }
    
    /**
     * Create new discount code
     * POST /api/admin/discounts
     */
    public function create(): array
    {
        Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $required = ['code', 'discount_type', 'discount_value'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                http_response_code(400);
                return ['error' => "Missing required field: {$field}"];
            }
        }
        
        // Validate discount type
        if (!in_array($data['discount_type'], ['percentage', 'fixed'])) {
            http_response_code(400);
            return ['error' => 'Invalid discount_type. Must be "percentage" or "fixed"'];
        }
        
        // Create discount code
        $discount = DiscountCode::create([
            'code' => strtoupper(trim($data['code'])),
            'discount_type' => $data['discount_type'],
            'discount_value' => $data['discount_value'],
            'max_discount' => $data['max_discount'] ?? null,
            'min_purchase' => $data['min_purchase'] ?? null,
            'usage_limit' => $data['usage_limit'] ?? null,
            'valid_from' => $data['valid_from'] ?? null,
            'valid_to' => $data['valid_to'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);
        
        return $discount;
    }
    
    /**
     * Update discount code
     * PUT /api/admin/discounts/{id}
     */
    public function update(int $id): array
    {
        Auth::requireAuth();
        
        $code = DiscountCode::find($id);
        if (!$code) {
            http_response_code(404);
            return ['error' => 'Discount code not found'];
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Update discount code
        $updateData = [];
        if (isset($data['code'])) $updateData['code'] = strtoupper(trim($data['code']));
        if (isset($data['discount_type'])) $updateData['discount_type'] = $data['discount_type'];
        if (isset($data['discount_value'])) $updateData['discount_value'] = $data['discount_value'];
        if (isset($data['max_discount'])) $updateData['max_discount'] = $data['max_discount'];
        if (isset($data['min_purchase'])) $updateData['min_purchase'] = $data['min_purchase'];
        if (isset($data['usage_limit'])) $updateData['usage_limit'] = $data['usage_limit'];
        if (isset($data['valid_from'])) $updateData['valid_from'] = $data['valid_from'];
        if (isset($data['valid_to'])) $updateData['valid_to'] = $data['valid_to'];
        if (isset($data['is_active'])) $updateData['is_active'] = $data['is_active'];
        
        DiscountCode::update($id, $updateData);
        
        return DiscountCode::find($id);
    }
    
    /**
     * Delete discount code
     * DELETE /api/admin/discounts/{id}
     */
    public function delete(int $id): array
    {
        Auth::requireAuth();
        
        $code = DiscountCode::find($id);
        if (!$code) {
            http_response_code(404);
            return ['error' => 'Discount code not found'];
        }
        
        DiscountCode::delete($id);
        
        return ['success' => true, 'message' => 'Discount code deleted'];
    }
}


