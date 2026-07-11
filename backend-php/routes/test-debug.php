<?php
/**
 * Debug endpoint to test product update
 * GET /api/test-debug/product/{id} - Get product data
 * POST /api/test-debug/product/{id} - Test update with sample data
 */

use App\Core\Database;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductImage;

$router->get('/test-debug/product/{id}', function($id) {
    try {
        $product = Product::findAdmin($id);
        if (!$product) {
            return ['error' => 'Product not found'];
        }
        
        $variants = ProductVariant::getByProduct($id);
        $images = ProductImage::getByProduct($id);
        
        return [
            'product' => $product,
            'variants' => $variants,
            'images' => $images,
            'variant_count' => count($variants),
            'image_count' => count($images),
        ];
    } catch (\Exception $e) {
        return [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ];
    }
});

$router->post('/test-debug/product/{id}', function($id) {
    try {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        
        return [
            'received_id' => $id,
            'raw_input' => substr($rawInput, 0, 1000),
            'decoded_data' => $data,
            'json_error' => json_last_error_msg(),
            'has_variants' => isset($data['variants']),
            'variants_count' => isset($data['variants']) ? count($data['variants']) : 0,
            'variants_data' => $data['variants'] ?? null,
        ];
    } catch (\Exception $e) {
        return [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ];
    }
});
