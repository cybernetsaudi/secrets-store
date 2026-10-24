<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductImage;
use App\Services\FileUploadService;
use App\Services\VariantNormalizer;

/**
 * Admin Product Management Controller
 * CRUD operations for products
 */
class AdminProductController
{
    /**
     * List all products (with pagination)
     * GET /api/admin/products
     */
    public function index(): array
    {
        Auth::requireAuth();
        
        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? 20);
        $offset = ($page - 1) * $limit;
        
        // Check if deleted_at column exists
        $hasDeletedAtColumn = $this->columnExists('deleted_at');
        
        // Build query with or without deleted_at filter
        if ($hasDeletedAtColumn) {
            $query = "SELECT * FROM products WHERE (deleted_at IS NULL OR deleted_at = '') ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $countQuery = "SELECT COUNT(*) as total FROM products WHERE (deleted_at IS NULL OR deleted_at = '')";
        } else {
            $query = "SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $countQuery = "SELECT COUNT(*) as total FROM products";
        }
        
        $stmt = \App\Core\Database::query($query, [$limit, $offset]);
        $products = $stmt->fetchAll();
        
        // Get total count (excluding soft-deleted if column exists)
        $countStmt = \App\Core\Database::query($countQuery);
        $total = $countStmt->fetch()['total'];
        
        // Load variants and images for each product
        foreach ($products as &$product) {
            $product['variants'] = ProductVariant::getByProduct($product['id']);
            $product['images'] = ProductImage::getByProductId($product['id']);
        }
        
        return [
            'results' => $products,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ];
    }
    
    /**
     * Get single product
     * GET /api/admin/products/{id}
     */
    public function show(int $id): array
    {
        Auth::requireAuth();
        
        $product = Product::findAdmin($id);
        if (!$product) {
            http_response_code(404);
            return ['error' => 'Product not found'];
        }
        
        $product['variants'] = ProductVariant::getByProduct($id);
        $product['images'] = ProductImage::getByProduct($id);
        
        return $product;
    }
    
    /**
     * Create new product
     * POST /api/admin/products
     */
    public function create(): array
    {
        Auth::requireAuth();
        
        // Handle both JSON and multipart/form-data
        $data = [];
        if ($_SERVER['CONTENT_TYPE'] && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
            // Form data
            $data = $_POST;
            // Handle JSON fields if they exist
            if (isset($data['variants'])) {
                $data['variants'] = json_decode($data['variants'], true) ?: [];
            }
            if (isset($data['images'])) {
                $data['images'] = json_decode($data['images'], true) ?: [];
            }
        } else {
            // JSON data
            $data = json_decode(file_get_contents('php://input'), true);
        }
        
        // Validate required fields
        $required = ['name', 'description', 'base_price', 'currency'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                http_response_code(400);
                return ['error' => "Missing required field: {$field}"];
            }
        }
        
        if (isset($data['variants']) && is_array($data['variants'])) {
            $data['variants'] = VariantNormalizer::normalizeList($data['variants']);
        }

        // Generate slug
        $slug = self::generateSlug($data['name']);
        
        // Create product
        $product = Product::create([
            'name' => $data['name'],
            'slug' => $slug,
            'description' => $data['description'],
            'short_description' => $data['short_description'] ?? null,
            'base_price' => $data['base_price'],
            'currency' => $data['currency'] ?? 'PKR',
            'is_active' => $data['is_active'] ?? true,
            'collection' => $data['collection'] ?? 'classic',
            'product_category' => $data['product_category'] ?? null,
        ]);

        if (array_key_exists('compare_at_price', $data)) {
            Product::update((int) $product['id'], [
                'compare_at_price' => $data['compare_at_price'],
            ]);
            $product = Product::findAdmin((int) $product['id']) ?: $product;
        }
        
        // Create variants
        if (!empty($data['variants']) && is_array($data['variants'])) {
            foreach ($data['variants'] as $variantData) {
                ProductVariant::create([
                    'product_id' => $product['id'],
                    'name' => $variantData['name'],
                    'option_color' => $variantData['option_color'] ?? null,
                    'option_size' => $variantData['option_size'] ?? null,
                    'option_cup' => $variantData['option_cup'] ?? null,
                    'swatch_image' => $variantData['swatch_image'] ?? null,
                    'description' => $variantData['description'] ?? null,
                    'price_modifier' => $variantData['price_modifier'] ?? 0,
                    'stock_quantity' => $variantData['stock_quantity'] ?? null,
                    'is_unlimited' => $variantData['is_unlimited'] ?? true,
                    'is_active' => $variantData['is_active'] ?? true,
                    'display_order' => $variantData['display_order'] ?? 0,
                ]);
            }
        }
        
        // Handle images: file uploads and/or URL images
        $imageErrors = [];
        $urlImages = $this->collectUrlImagesFromData($data);
        $uploadFiles = $this->getUploadedProductImageFiles();
        $uploadedImages = [];

        if (!empty($uploadFiles)) {
            $uploadResult = $this->processProductImageUploads(
                $uploadFiles,
                (int) $product['id'],
                $data['name']
            );
            $uploadedImages = $uploadResult['saved'];
            $imageErrors = array_merge($imageErrors, $uploadResult['errors']);
        }

        $finalImages = $this->mergeProductImages($uploadedImages, $urlImages);
        if (!empty($finalImages)) {
            $this->persistProductImages((int) $product['id'], $finalImages);
        }

        $response = $this->show($product['id']);
        if (!empty($imageErrors)) {
            $response['image_errors'] = $imageErrors;
            if (empty($finalImages)) {
                $response['warning'] = 'Product saved but no images could be uploaded.';
            } else {
                $response['warning'] = 'Product saved but some images could not be uploaded.';
            }
        }

        return $response;
    }
    
    /**
     * Update product
     * PUT /api/admin/products/{id}
     */
    public function update(int $id): array
    {
        try {
            Auth::requireAuth();
            
            $product = Product::findAdmin($id);
            if (!$product) {
                http_response_code(404);
                return ['error' => 'Product not found'];
            }
            
            // Handle both JSON and multipart/form-data
            $data = [];
            if ($_SERVER['CONTENT_TYPE'] && strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') !== false) {
                // Form data
                $data = $_POST;
                // Handle JSON fields if they exist
                if (isset($data['variants'])) {
                    $data['variants'] = json_decode($data['variants'], true) ?: [];
                }
                if (isset($data['images'])) {
                    $data['images'] = json_decode($data['images'], true) ?: [];
                }
            } else {
                // JSON data
                $rawInput = file_get_contents('php://input');
                $data = json_decode($rawInput, true);
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log("AdminProductController::update - JSON decode error: " . json_last_error_msg());
                    error_log("AdminProductController::update - Raw input: " . substr($rawInput, 0, 500));
                    http_response_code(400);
                    return ['error' => 'Invalid JSON data: ' . json_last_error_msg()];
                }
            }
        
        // Update product
        $updateData = [];
        if (isset($data['name'])) $updateData['name'] = $data['name'];
        if (isset($data['description'])) $updateData['description'] = $data['description'];
        if (isset($data['short_description'])) $updateData['short_description'] = $data['short_description'];
        if (isset($data['base_price'])) $updateData['base_price'] = $data['base_price'];
        if (isset($data['currency'])) $updateData['currency'] = $data['currency'];
        if (isset($data['is_active'])) $updateData['is_active'] = $data['is_active'];
        if (isset($data['collection'])) $updateData['collection'] = $data['collection'];
        if (array_key_exists('product_category', $data)) $updateData['product_category'] = $data['product_category'] ?: null;
        if (array_key_exists('compare_at_price', $data)) $updateData['compare_at_price'] = $data['compare_at_price'];
        
        if (!empty($updateData)) {
            if (isset($updateData['name']) && $updateData['name'] !== $product['name']) {
                $updateData['slug'] = self::generateSlug($updateData['name']);
            }
            Product::update($id, $updateData);
        }
        
        // Update variants
        if (isset($data['variants']) && is_array($data['variants'])) {
            $data['variants'] = VariantNormalizer::normalizeList($data['variants']);
            try {
                // Get existing variants (including inactive ones)
                $existingVariants = ProductVariant::getByProduct($id);
                $existingVariantIds = array_column($existingVariants, 'id');
                // Create a map of variant name (lowercase) to variant for quick lookup
                $existingVariantsByName = [];
                foreach ($existingVariants as $ev) {
                    $existingVariantsByName[strtolower(trim($ev['name']))] = $ev;
                }
                
                $newVariantIds = [];
                
                // Update or create variants
                foreach ($data['variants'] as $index => $variantData) {
                    $variantName = trim($variantData['name'] ?? '');
                    if (empty($variantName)) {
                        continue; // Skip empty variant names
                    }
                    
                    $variantId = isset($variantData['id']) ? intval($variantData['id']) : null;
                    $variantNameLower = strtolower($variantName);
                    
                    // Check if variant exists by ID first, then by name
                    $existingVariant = null;
                    if ($variantId && in_array($variantId, $existingVariantIds)) {
                        // Found by ID
                        foreach ($existingVariants as $ev) {
                            if ($ev['id'] == $variantId) {
                                $existingVariant = $ev;
                                break;
                            }
                        }
                    } elseif (isset($existingVariantsByName[$variantNameLower])) {
                        // Found by name (variant might not have ID in request)
                        $existingVariant = $existingVariantsByName[$variantNameLower];
                        $variantId = $existingVariant['id'];
                    }
                    
                    if ($existingVariant) {
                        // Update existing variant
                        ProductVariant::update($variantId, [
                            'name' => $variantName,
                            'option_color' => $variantData['option_color'] ?? null,
                            'option_size' => $variantData['option_size'] ?? null,
                            'option_cup' => $variantData['option_cup'] ?? null,
                            'swatch_image' => $variantData['swatch_image'] ?? null,
                            'description' => $variantData['description'] ?? null,
                            'price_modifier' => floatval($variantData['price_modifier'] ?? 0),
                            'stock_quantity' => $variantData['stock_quantity'] ?? null,
                            'is_unlimited' => $variantData['is_unlimited'] ?? true,
                            'is_active' => $variantData['is_active'] ?? true,
                            'display_order' => $variantData['display_order'] ?? $index,
                        ]);
                        $newVariantIds[] = $variantId;
                    } else {
                        // Create new variant
                        try {
                            $newVariant = ProductVariant::create([
                                'product_id' => $id,
                                'name' => $variantName,
                                'option_color' => $variantData['option_color'] ?? null,
                                'option_size' => $variantData['option_size'] ?? null,
                                'option_cup' => $variantData['option_cup'] ?? null,
                                'swatch_image' => $variantData['swatch_image'] ?? null,
                                'description' => $variantData['description'] ?? null,
                                'price_modifier' => floatval($variantData['price_modifier'] ?? 0),
                                'stock_quantity' => $variantData['stock_quantity'] ?? null,
                                'is_unlimited' => $variantData['is_unlimited'] ?? true,
                                'is_active' => $variantData['is_active'] ?? true,
                                'display_order' => $variantData['display_order'] ?? $index,
                            ]);
                            if (isset($newVariant['id'])) {
                                $newVariantIds[] = $newVariant['id'];
                            }
                        } catch (\PDOException $e) {
                            // If duplicate entry error, try to find and update the existing variant
                            if ($e->getCode() == 23000 && strpos($e->getMessage(), 'Duplicate entry') !== false) {
                                error_log("AdminProductController::update - Duplicate variant detected, attempting to find and update: " . $variantName);
                                // Try to find by name and update it
                                $stmt = \App\Core\Database::query(
                                    "SELECT * FROM product_variants WHERE product_id = ? AND LOWER(TRIM(name)) = ? LIMIT 1",
                                    [$id, $variantNameLower]
                                );
                                $duplicateVariant = $stmt->fetch();
                                if ($duplicateVariant) {
                                    ProductVariant::update($duplicateVariant['id'], [
                                        'name' => $variantName,
                                        'option_color' => $variantData['option_color'] ?? null,
                                        'option_size' => $variantData['option_size'] ?? null,
                                        'option_cup' => $variantData['option_cup'] ?? null,
                                        'swatch_image' => $variantData['swatch_image'] ?? null,
                                        'description' => $variantData['description'] ?? null,
                                        'price_modifier' => floatval($variantData['price_modifier'] ?? 0),
                                        'stock_quantity' => $variantData['stock_quantity'] ?? null,
                                        'is_unlimited' => $variantData['is_unlimited'] ?? true,
                                        'is_active' => $variantData['is_active'] ?? true,
                                        'display_order' => $variantData['display_order'] ?? $index,
                                    ]);
                                    $newVariantIds[] = $duplicateVariant['id'];
                                } else {
                                    throw $e; // Re-throw if we can't find it
                                }
                            } else {
                                throw $e; // Re-throw other errors
                            }
                        }
                    }
                }
                
                // Soft-delete variants that are no longer in the list (mark as inactive instead of deleting)
                // This preserves foreign key relationships with order_items
                foreach ($existingVariants as $existingVariant) {
                    if (!in_array($existingVariant['id'], $newVariantIds)) {
                        ProductVariant::update($existingVariant['id'], ['is_active' => false]);
                    }
                }
            } catch (\Exception $e) {
                error_log("AdminProductController::update - Variant update error: " . $e->getMessage());
                error_log("AdminProductController::update - Stack trace: " . $e->getTraceAsString());
                throw $e; // Re-throw to be caught by outer try-catch
            }
        }
        
        // Handle images: upload first, replace or clear when images field is sent
        $imageErrors = [];
        $imagesProvided = array_key_exists('images', $data);
        $urlImages = $this->collectUrlImagesFromData($data);
        $uploadFiles = $this->getUploadedProductImageFiles();
        $uploadedImages = [];

        if (!empty($uploadFiles)) {
            $uploadResult = $this->processProductImageUploads(
                $uploadFiles,
                $id,
                $data['name'] ?? $product['name']
            );
            $uploadedImages = $uploadResult['saved'];
            $imageErrors = array_merge($imageErrors, $uploadResult['errors']);
        }

        $finalImages = $this->mergeProductImages($uploadedImages, $urlImages);
        if (!empty($finalImages)) {
            $this->persistProductImages($id, $finalImages);
        } elseif ($imagesProvided && empty($uploadFiles)) {
            ProductImage::deleteByProduct($id);
        } elseif (!empty($uploadFiles) && empty($finalImages)) {
            // Upload attempted but every file failed — keep existing images in DB
            error_log("AdminProductController::update - Image upload failed for product {$id}: " . implode('; ', $imageErrors));
        }
        // If images field omitted entirely, keep existing images
        
            $response = $this->show($id);
            if (!empty($imageErrors)) {
                $response['image_errors'] = $imageErrors;
                if (empty($finalImages)) {
                    $response['warning'] = 'Product updated but no images could be uploaded. Existing images were kept.';
                } else {
                    $response['warning'] = 'Product updated but some images could not be uploaded.';
                }
            }

            return $response;
        } catch (\Exception $e) {
            error_log("AdminProductController::update - Exception: " . $e->getMessage());
            error_log("AdminProductController::update - Stack trace: " . $e->getTraceAsString());
            http_response_code(500);
            return [
                'error' => 'Failed to update product: ' . $e->getMessage(),
                'details' => $e->getTraceAsString()
            ];
        }
    }
    
    /**
     * Delete product (soft delete)
     * DELETE /api/admin/products/{id}
     * 
     * Uses soft delete: Products with orders are soft-deleted (deleted_at timestamp set)
     * Products without orders are hard-deleted. This preserves order history.
     */
    public function delete(int $id): array
    {
        Auth::requireAuth();
        
        $product = Product::findAdmin($id);
        if (!$product) {
            http_response_code(404);
            return ['error' => 'Product not found'];
        }
        
        // Check if already soft-deleted
        if (!empty($product['deleted_at'])) {
            http_response_code(400);
            return ['error' => 'Product is already deleted'];
        }
        
        try {
            Product::delete($id);
            
            // Check if product has orders (soft delete) or was hard deleted
            $checkProduct = Product::findAdmin($id);
            if ($hasDeletedAtColumn && $checkProduct && !empty($checkProduct['deleted_at'])) {
                return [
                    'success' => true, 
                    'message' => 'Product deleted (soft delete - preserved for order history)',
                    'soft_deleted' => true
                ];
            } else {
                return [
                    'success' => true, 
                    'message' => 'Product permanently deleted',
                    'soft_deleted' => false
                ];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return [
                'error' => 'Failed to delete product: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Toggle product active/inactive (hide/unhide)
     * POST /api/admin/products/{id}/toggle-active
     */
    public function toggleActive(int $id): array
    {
        Auth::requireAuth();

        $product = Product::findAdmin($id);
        if (!$product) {
            http_response_code(404);
            return ['error' => 'Product not found'];
        }

        // If soft-deleted, do not allow toggling (avoid inconsistent state)
        if (!empty($product['deleted_at'])) {
            http_response_code(400);
            return ['error' => 'Cannot change status of a deleted product'];
        }

        $newValue = empty($product['is_active']) ? 1 : 0;

        try {
            $updated = Product::update($id, ['is_active' => (bool)$newValue]);
            return [
                'success' => true,
                'product' => $updated,
                'is_active' => (int)($updated['is_active'] ?? $newValue),
            ];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to update product status'];
        }
    }
    
    /**
     * Normalise $_FILES for product image uploads (supports product_images and product_images[] field names).
     */
    private function getUploadedProductImageFiles(): array
    {
        $files = [];
        foreach (['product_images', 'product_images[]'] as $fieldKey) {
            if (empty($_FILES[$fieldKey])) {
                continue;
            }
            $entry = $_FILES[$fieldKey];
            if (is_array($entry['error'])) {
                $count = count($entry['name']);
                for ($i = 0; $i < $count; $i++) {
                    $files[] = [
                        'name' => $entry['name'][$i],
                        'type' => $entry['type'][$i],
                        'tmp_name' => $entry['tmp_name'][$i],
                        'error' => $entry['error'][$i],
                        'size' => $entry['size'][$i],
                    ];
                }
            } else {
                $files[] = $entry;
            }
        }
        return $files;
    }

    /**
     * @return array<int, array{url: string, alt_text: string}>
     */
    private function collectUrlImagesFromData(array $data): array
    {
        $urlImages = [];
        if (empty($data['images']) || !is_array($data['images'])) {
            return $urlImages;
        }
        foreach ($data['images'] as $imageData) {
            $imageUrl = is_array($imageData) ? ($imageData['url'] ?? '') : $imageData;
            if (!empty($imageUrl) && !is_object($imageUrl)) {
                $urlImages[] = [
                    'url' => $imageUrl,
                    'alt_text' => is_array($imageData) ? ($imageData['alt_text'] ?? '') : '',
                ];
            }
        }
        return $urlImages;
    }

    /**
     * @param array<int, array<string, mixed>> $files
     * @return array{saved: array<int, array{url: string, alt_text: string}>, errors: array<int, string>}
     */
    private function processProductImageUploads(array $files, int $productId, string $altBase): array
    {
        $saved = [];
        $errors = [];
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds server upload limit',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds form size limit',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder on server',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'File upload blocked by server',
        ];

        foreach ($files as $file) {
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $label = $file['name'] ?? 'Image';
                $errors[] = $label . ': ' . ($uploadErrors[$file['error']] ?? 'Upload error');
                continue;
            }

            $upload = FileUploadService::uploadProductImage($file, $productId);
            if ($upload['success']) {
                $saved[] = [
                    'url' => $upload['url'],
                    'alt_text' => $altBase . ' - Image ' . (count($saved) + 1),
                ];
            } else {
                $label = $file['name'] ?? 'Image';
                $message = $upload['error'] ?? 'Unknown error';
                $errors[] = $label . ': ' . $message;
                error_log("Failed to upload product image (product {$productId}): {$message}");
            }
        }

        return ['saved' => $saved, 'errors' => $errors];
    }

    /**
     * @param array<int, array{url: string, alt_text: string}> $uploaded
     * @param array<int, array{url: string, alt_text: string}> $urls
     * @return array<int, array{url: string, alt_text: string}>
     */
    private function mergeProductImages(array $uploaded, array $urls): array
    {
        $merged = $uploaded;
        $existingUrls = array_column($merged, 'url');
        foreach ($urls as $urlImage) {
            if (!in_array($urlImage['url'], $existingUrls, true)) {
                $merged[] = $urlImage;
                $existingUrls[] = $urlImage['url'];
            }
        }
        return $merged;
    }

    /**
     * @param array<int, array{url: string, alt_text: string}> $images
     */
    private function persistProductImages(int $productId, array $images): void
    {
        ProductImage::deleteByProduct($productId);
        foreach ($images as $index => $image) {
            ProductImage::create([
                'product_id' => $productId,
                'image' => $image['url'],
                'alt_text' => $image['alt_text'] ?: null,
                'is_primary' => $index === 0 ? 1 : 0,
                'display_order' => $index,
            ]);
        }
    }
    
    /**
     * Generate URL-friendly slug from name
     */
    private static function generateSlug(string $name): string
    {
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9-]/', '-', $slug);
        $slug = preg_replace('/-+/', '-', $slug);
        $slug = trim($slug, '-');
        
        // Ensure uniqueness
        $originalSlug = $slug;
        $counter = 1;
        while (Product::findBySlug($slug)) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }
    
    /**
     * Check if a column exists in the products table
     */
    private function columnExists(string $columnName): bool
    {
        static $columnCache = [];
        
        if (isset($columnCache[$columnName])) {
            return $columnCache[$columnName];
        }
        
        try {
            $db = \App\Core\Database::getInstance();
            $stmt = $db->query("DESCRIBE products");
            $columns = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            $columnNames = array_column($columns, 'Field');
            $exists = in_array($columnName, $columnNames);
            $columnCache[$columnName] = $exists;
            return $exists;
        } catch (\Exception $e) {
            error_log("AdminProductController::columnExists error: " . $e->getMessage());
            // If we can't check, assume column doesn't exist to be safe
            $columnCache[$columnName] = false;
            return false;
        }
    }
}
