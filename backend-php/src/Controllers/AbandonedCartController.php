<?php

namespace App\Controllers;

use App\Models\AbandonedCart;

/**
 * Abandoned Cart Controller
 * Handles abandoned cart tracking and email reminders
 */
class AbandonedCartController
{
    /**
     * Save abandoned cart
     * POST /api/abandoned-cart
     */
    public function save(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['cart_data'])) {
            http_response_code(400);
            return ['error' => 'Cart data is required'];
        }
        
        // Only save if email is provided
        if (empty($data['guest_email'])) {
            return ['success' => false, 'message' => 'Email required to save cart'];
        }
        
        $cart = AbandonedCart::createOrUpdate([
            'guest_email' => $data['guest_email'],
            'guest_name' => $data['guest_name'] ?? null,
            'guest_phone' => $data['guest_phone'] ?? null,
            'cart_data' => $data['cart_data'],
            'subtotal' => $data['subtotal'] ?? 0,
            'currency' => $data['currency'] ?? 'PKR',
            'discount_code' => $data['discount_code'] ?? null,
            'session_id' => session_id(),
        ]);
        
        return ['success' => true, 'cart_id' => $cart['id']];
    }
    
    /**
     * Get abandoned cart by email or session
     * GET /api/abandoned-cart?email=... or ?session_id=...
     */
    public function get(): array
    {
        $email = $_GET['email'] ?? null;
        $sessionId = $_GET['session_id'] ?? null;
        
        if (!$email && !$sessionId) {
            http_response_code(400);
            return ['error' => 'Email or session_id required'];
        }
        
        if ($email) {
            $stmt = \App\Core\Database::query(
                "SELECT * FROM abandoned_carts 
                 WHERE guest_email = ? AND recovered = 0 
                 ORDER BY created_at DESC LIMIT 1",
                [$email]
            );
        } else {
            $stmt = \App\Core\Database::query(
                "SELECT * FROM abandoned_carts 
                 WHERE session_id = ? AND recovered = 0 
                 ORDER BY created_at DESC LIMIT 1",
                [$sessionId]
            );
        }
        
        $cart = $stmt->fetch();
        
        if ($cart && $cart['cart_data']) {
            $cart['cart_data'] = json_decode($cart['cart_data'], true);
        }
        
        return $cart ?: ['error' => 'Cart not found'];
    }
}


