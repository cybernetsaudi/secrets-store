<?php

namespace App\Controllers;

use App\Models\DiscountCode;

class DiscountController
{
    public function validate(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        $code = strtoupper($data['code'] ?? '');
        $orderAmount = floatval($data['order_amount'] ?? 0);
        
        $discountCode = DiscountCode::findByCode($code);
        
        if (!$discountCode) {
            http_response_code(400);
            return ['error' => 'Invalid discount code'];
        }
        
        if (!DiscountCode::isValid($discountCode)) {
            http_response_code(400);
            return ['error' => 'Discount code is not valid or has expired'];
        }
        
        $discountAmount = DiscountCode::calculateDiscount($discountCode, $orderAmount);
        
        return [
            'valid' => true,
            'code' => $discountCode['code'],
            'discount_type' => $discountCode['discount_type'],
            'discount_value' => (string)$discountCode['discount_value'],
            'discount_amount' => (string)$discountAmount,
            'message' => "Discount code applied: {$discountCode['discount_value']}" . 
                        ($discountCode['discount_type'] === 'percentage' ? '%' : ' AED') . ' off',
        ];
    }
}


