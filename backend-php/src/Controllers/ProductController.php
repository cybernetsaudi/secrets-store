<?php

namespace App\Controllers;

use App\Models\Product;

class ProductController
{
    public function index(): array
    {
        $search = $_GET['search'] ?? null;
        $products = Product::all($search);
        return ['results' => $products];
    }
    
    public function show(int $id): array
    {
        $product = Product::find($id);
        
        if (!$product) {
            http_response_code(404);
            return ['error' => 'Product not found'];
        }
        
        return $product;
    }
}


