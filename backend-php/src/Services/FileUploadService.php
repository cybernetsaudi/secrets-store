<?php

namespace App\Services;

/**
 * File Upload Service
 * Handles secure file uploads for logos and product images
 */
class FileUploadService
{
    private const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (matches php.ini on server)
    // SECURITY: SVG removed - can contain JavaScript and pose XSS risk
    private const ALLOWED_IMAGE_TYPES = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'image/heic', 'image/heif',
    ];
    // Upload directory: from src/Services/ -> src/ -> root -> uploads/
    // On server: public_html/api/src/Services/ -> public_html/api/src/ -> public_html/api/ -> public_html/api/uploads/
    private const UPLOAD_BASE_DIR = __DIR__ . '/../../uploads';
    
    /**
     * Upload logo file
     * @param array $file $_FILES array element
     * @param string $type 'site_logo' or 'header_logo'
     * @return array ['success' => bool, 'path' => string, 'url' => string, 'error' => string]
     */
    public static function uploadLogo(array $file, string $type = 'site_logo'): array
    {
        try {
            // Validate file
            $validation = self::validateFile($file);
            if (!$validation['valid']) {
                return ['success' => false, 'error' => $validation['error']];
            }
            
            // Create uploads directory if it doesn't exist
            $logoDir = self::UPLOAD_BASE_DIR . '/logos';
            if (!is_dir($logoDir)) {
                mkdir($logoDir, 0755, true);
            }
            
            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = $type . '_' . time() . '_' . uniqid() . '.' . $extension;
            $filepath = $logoDir . '/' . $filename;
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                return ['success' => false, 'error' => 'Failed to save uploaded file'];
            }
            
            // Generate public URL
            $publicUrl = '/api/uploads/logos/' . $filename;
            
            return [
                'success' => true,
                'path' => $filepath,
                'url' => $publicUrl,
                'filename' => $filename
            ];
        } catch (\Exception $e) {
            error_log("FileUploadService::uploadLogo error: " . $e->getMessage());
            return ['success' => false, 'error' => 'Upload failed: ' . $e->getMessage()];
        }
    }
    
    /**
     * Upload product image file
     * @param array $file $_FILES array element
     * @param int $productId Product ID
     * @return array ['success' => bool, 'path' => string, 'url' => string, 'error' => string]
     */
    public static function uploadProductImage(array $file, int $productId): array
    {
        try {
            // Validate file
            $validation = self::validateFile($file);
            if (!$validation['valid']) {
                return ['success' => false, 'error' => $validation['error']];
            }
            
            // Create uploads directory if it doesn't exist
            $imageDir = self::UPLOAD_BASE_DIR . '/products';
            if (!is_dir($imageDir)) {
                mkdir($imageDir, 0755, true);
            }
            
            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = 'product_' . $productId . '_' . time() . '_' . uniqid() . '.' . $extension;
            $filepath = $imageDir . '/' . $filename;
            
            // Move uploaded file
            if (!move_uploaded_file($file['tmp_name'], $filepath)) {
                return ['success' => false, 'error' => 'Failed to save uploaded file'];
            }
            
            // Generate public URL
            $publicUrl = '/api/uploads/products/' . $filename;
            
            return [
                'success' => true,
                'path' => $filepath,
                'url' => $publicUrl,
                'filename' => $filename
            ];
        } catch (\Exception $e) {
            error_log("FileUploadService::uploadProductImage error: " . $e->getMessage());
            return ['success' => false, 'error' => 'Upload failed: ' . $e->getMessage()];
        }
    }
    
    /**
     * Validate uploaded file
     */
    private static function validateFile(array $file): array
    {
        // Check if file was uploaded
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            return ['valid' => false, 'error' => 'No file uploaded'];
        }
        
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errorMessages = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'File upload stopped by extension',
            ];
            return ['valid' => false, 'error' => $errorMessages[$file['error']] ?? 'Unknown upload error'];
        }
        
        // Check file size
        if ($file['size'] > self::MAX_FILE_SIZE) {
            return ['valid' => false, 'error' => 'File size exceeds 10MB limit'];
        }
        
        // Check file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, self::ALLOWED_IMAGE_TYPES)) {
            return ['valid' => false, 'error' => 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, HEIC'];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Delete file
     */
    public static function deleteFile(string $filepath): bool
    {
        if (file_exists($filepath) && is_file($filepath)) {
            return unlink($filepath);
        }
        return false;
    }
    
    /**
     * Get public URL from file path
     */
    public static function getPublicUrl(string $filepath): ?string
    {
        // Convert absolute path to public URL
        if (strpos($filepath, self::UPLOAD_BASE_DIR) === 0) {
            $relativePath = str_replace(self::UPLOAD_BASE_DIR, '', $filepath);
            return '/api/uploads' . $relativePath;
        }
        return null;
    }
}

