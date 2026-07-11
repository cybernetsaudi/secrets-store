<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\Setting;
use App\Services\FileUploadService;
use App\Services\EncryptionService;

/**
 * Admin Settings Controller
 * Manages application settings (email config, etc.)
 */
class AdminSettingsController
{
    /**
     * Get all settings
     * GET /api/admin/settings
     */
    public function index(): array
    {
        Auth::requireAuth();
        
        return Setting::all();
    }
    
    /**
     * Get email settings
     * GET /api/admin/settings/email
     */
    public function getEmailSettings(): array
    {
        Auth::requireAuth();
        
        return [
            'email_host' => Setting::get('email_host', ''),
            'email_port' => Setting::get('email_port', '587'),
            'email_username' => Setting::get('email_username', ''),
            'email_password' => Setting::get('email_password', ''), // Note: stored encrypted
            'email_from' => Setting::get('email_from', ''),
            'email_from_name' => Setting::get('email_from_name', ''),
            'staff_email' => Setting::get('staff_email', ''),
        ];
    }
    
    /**
     * Update email settings
     * PUT /api/admin/settings/email
     */
    public function updateEmailSettings(): array
    {
        Auth::requireAuth();
        
        $user = Auth::user();
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Update each setting
        if (isset($data['email_host'])) {
            Setting::set('email_host', $data['email_host'], 'string', $user['id']);
        }
        if (isset($data['email_port'])) {
            Setting::set('email_port', $data['email_port'], 'string', $user['id']);
        }
        if (isset($data['email_username'])) {
            Setting::set('email_username', $data['email_username'], 'string', $user['id']);
        }
        if (isset($data['email_password'])) {
            // Encrypt password before storing using AES-256
            $encrypted = EncryptionService::encrypt($data['email_password']);
            Setting::set('email_password', $encrypted, 'string', $user['id']);
        }
        if (isset($data['email_from'])) {
            Setting::set('email_from', $data['email_from'], 'string', $user['id']);
        }
        if (isset($data['email_from_name'])) {
            Setting::set('email_from_name', $data['email_from_name'], 'string', $user['id']);
        }
        if (isset($data['staff_email'])) {
            Setting::set('staff_email', $data['staff_email'], 'string', $user['id']);
        }
        
        return $this->getEmailSettings();
    }
    
    /**
     * Test email configuration
     * POST /api/admin/settings/email/test
     */
    public function testEmail(): array
    {
        Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        $host = $data['email_host'] ?? Setting::get('email_host', '');
        $port = $data['email_port'] ?? Setting::get('email_port', '587');
        $username = $data['email_username'] ?? Setting::get('email_username', '');
        $password = $data['email_password'] ?? '';
        if (empty($password)) {
            $encrypted = Setting::get('email_password', '');
            if ($encrypted) {
                // Try to decrypt (may be old base64 or new encrypted)
                if (EncryptionService::isEncrypted($encrypted)) {
                    try {
                        $password = EncryptionService::decrypt($encrypted);
                    } catch (\Exception $e) {
                        // Fallback to base64 for backward compatibility
                        $password = base64_decode($encrypted) ?: '';
                    }
                } else {
                    // Legacy base64 encoded
                    $password = base64_decode($encrypted) ?: '';
                }
            }
        }
        $from = $data['email_from'] ?? Setting::get('email_from', '');
        $to = $data['test_email'] ?? Setting::get('staff_email', '');
        
        if (empty($host) || empty($username) || empty($password)) {
            http_response_code(400);
            return ['success' => false, 'error' => 'Email configuration incomplete'];
        }
        
        try {
            // Use PHP mail() or PHPMailer if available
            // For now, simple test
            $subject = 'Gulf United FC - Email Configuration Test';
            $message = "This is a test email from your Gulf United FC e-commerce store.\n\n";
            $message .= "If you receive this, your email configuration is working correctly.\n\n";
            $message .= "Sent at: " . date('Y-m-d H:i:s');
            
            $headers = "From: {$from}\r\n";
            $headers .= "Reply-To: {$from}\r\n";
            $headers .= "X-Mailer: PHP/" . phpversion();
            
            // Try to send using configured SMTP
            // Note: For production, use PHPMailer or similar library
            $result = @mail($to, $subject, $message, $headers);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Test email sent successfully. Please check your inbox.',
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to send test email. Please check your SMTP configuration.',
                ];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return [
                'success' => false,
                'error' => 'Error sending test email: ' . $e->getMessage(),
            ];
        }
    }
    
    /**
     * Get logo settings
     * GET /api/admin/settings/logo (admin) or GET /api/settings/logo (public)
     */
    public function getLogoSettings(): array
    {
        // Public endpoint - no auth required for reading logos
        return [
            'site_logo_url' => Setting::get('site_logo_url', ''),
            'header_logo_url' => Setting::get('header_logo_url', ''),
        ];
    }
    
    /**
     * Update logo settings (file upload or URL)
     * POST /api/admin/settings/logo
     */
    public function updateLogoSettings(): array
    {
        Auth::requireAuth();
        
        $user = Auth::user();
        
        // Handle file uploads
        if (isset($_FILES['site_logo']) && $_FILES['site_logo']['error'] === UPLOAD_ERR_OK) {
            $upload = FileUploadService::uploadLogo($_FILES['site_logo'], 'site_logo');
            if ($upload['success']) {
                Setting::set('site_logo_url', $upload['url'], 'string', $user['id']);
            } else {
                http_response_code(400);
                return ['success' => false, 'error' => 'Site logo upload failed: ' . $upload['error']];
            }
        } elseif (isset($_POST['site_logo_url'])) {
            // URL provided instead of file
            Setting::set('site_logo_url', $_POST['site_logo_url'], 'string', $user['id']);
        }
        
        if (isset($_FILES['header_logo']) && $_FILES['header_logo']['error'] === UPLOAD_ERR_OK) {
            $upload = FileUploadService::uploadLogo($_FILES['header_logo'], 'header_logo');
            if ($upload['success']) {
                Setting::set('header_logo_url', $upload['url'], 'string', $user['id']);
            } else {
                http_response_code(400);
                return ['success' => false, 'error' => 'Header logo upload failed: ' . $upload['error']];
            }
        } elseif (isset($_POST['header_logo_url'])) {
            // URL provided instead of file
            Setting::set('header_logo_url', $_POST['header_logo_url'], 'string', $user['id']);
        }
        
        return $this->getLogoSettings();
    }
    
    /**
     * Get visual settings (logos + landing page images)
     * GET /api/admin/settings/visual
     */
    public function getVisualSettings(): array
    {
        Auth::requireAuth();
        
        return [
            'site_logo_url' => Setting::get('site_logo_url', ''),
            'header_logo_url' => Setting::get('header_logo_url', ''),
            'landing_bg_image_url' => Setting::get('landing_bg_image_url', ''),
            'products_bg_image_url' => Setting::get('products_bg_image_url', ''),
            'landing_tile_1_image' => Setting::get('landing_tile_1_image', ''),
            'landing_tile_2_image' => Setting::get('landing_tile_2_image', ''),
            'landing_tile_3_image' => Setting::get('landing_tile_3_image', ''),
            'landing_tile_4_image' => Setting::get('landing_tile_4_image', ''),
            'landing_tile_5_image' => Setting::get('landing_tile_5_image', ''),
            'landing_tile_6_image' => Setting::get('landing_tile_6_image', ''),
            // Filter settings
            'landing_bg_contrast' => Setting::get('landing_bg_contrast', '1'),
            'landing_bg_saturation' => Setting::get('landing_bg_saturation', '1'),
            'landing_bg_brightness' => Setting::get('landing_bg_brightness', '0.7'),
            'products_bg_contrast' => Setting::get('products_bg_contrast', '1'),
            'products_bg_saturation' => Setting::get('products_bg_saturation', '1'),
            'products_bg_brightness' => Setting::get('products_bg_brightness', '0.7'),
        ];
    }
    
    /**
     * Update visual settings
     * PUT /api/admin/settings/visual
     */
    public function updateVisualSettings(): array
    {
        Auth::requireAuth();
        
        $user = Auth::user();
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Allow empty strings to clear settings
        if (isset($data['site_logo_url'])) {
            Setting::set('site_logo_url', $data['site_logo_url'], 'string', $user['id']);
        }
        if (isset($data['header_logo_url'])) {
            Setting::set('header_logo_url', $data['header_logo_url'], 'string', $user['id']);
        }
        if (isset($data['landing_bg_image_url'])) {
            Setting::set('landing_bg_image_url', $data['landing_bg_image_url'], 'string', $user['id']);
        }
        if (isset($data['products_bg_image_url'])) {
            Setting::set('products_bg_image_url', $data['products_bg_image_url'], 'string', $user['id']);
        }
        // Tile images
        if (isset($data['landing_tile_1_image'])) {
            Setting::set('landing_tile_1_image', $data['landing_tile_1_image'], 'string', $user['id']);
        }
        if (isset($data['landing_tile_2_image'])) {
            Setting::set('landing_tile_2_image', $data['landing_tile_2_image'], 'string', $user['id']);
        }
        if (isset($data['landing_tile_3_image'])) {
            Setting::set('landing_tile_3_image', $data['landing_tile_3_image'], 'string', $user['id']);
        }
        if (isset($data['landing_tile_4_image'])) {
            Setting::set('landing_tile_4_image', $data['landing_tile_4_image'], 'string', $user['id']);
        }
        if (isset($data['landing_tile_5_image'])) {
            Setting::set('landing_tile_5_image', $data['landing_tile_5_image'], 'string', $user['id']);
        }
        if (isset($data['landing_tile_6_image'])) {
            Setting::set('landing_tile_6_image', $data['landing_tile_6_image'], 'string', $user['id']);
        }
        // Filter settings
        if (isset($data['landing_bg_contrast'])) {
            Setting::set('landing_bg_contrast', (string)$data['landing_bg_contrast'], 'string', $user['id']);
        }
        if (isset($data['landing_bg_saturation'])) {
            Setting::set('landing_bg_saturation', (string)$data['landing_bg_saturation'], 'string', $user['id']);
        }
        if (isset($data['landing_bg_brightness'])) {
            Setting::set('landing_bg_brightness', (string)$data['landing_bg_brightness'], 'string', $user['id']);
        }
        if (isset($data['products_bg_contrast'])) {
            Setting::set('products_bg_contrast', (string)$data['products_bg_contrast'], 'string', $user['id']);
        }
        if (isset($data['products_bg_saturation'])) {
            Setting::set('products_bg_saturation', (string)$data['products_bg_saturation'], 'string', $user['id']);
        }
        if (isset($data['products_bg_brightness'])) {
            Setting::set('products_bg_brightness', (string)$data['products_bg_brightness'], 'string', $user['id']);
        }
        
        return $this->getVisualSettings();
    }
    
    /**
     * Upload image for visual settings
     * POST /api/admin/settings/visual/upload
     */
    public function uploadVisualImage(): array
    {
        Auth::requireAuth();
        
        $user = Auth::user();
        $imageIndex = isset($_POST['image_index']) ? (int)$_POST['image_index'] : null;
        
        // Determine which type of image is being uploaded
        $imageType = null;
        $fileKey = null;
        $urlKey = null;
        
        if (isset($_FILES['site_logo']) && $_FILES['site_logo']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'site_logo';
            $fileKey = 'site_logo';
            $urlKey = 'site_logo_url';
        } elseif (isset($_FILES['header_logo']) && $_FILES['header_logo']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'header_logo';
            $fileKey = 'header_logo';
            $urlKey = 'header_logo_url';
        } elseif (isset($_FILES['landing_bg_image']) && $_FILES['landing_bg_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'landing_bg_image';
            $fileKey = 'landing_bg_image';
            $urlKey = 'landing_bg_image_url';
        } elseif (isset($_FILES['products_bg_image']) && $_FILES['products_bg_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'products_bg_image';
            $fileKey = 'products_bg_image';
            $urlKey = 'products_bg_image_url';
        } elseif (isset($_FILES['landing_tile_1_image']) && $_FILES['landing_tile_1_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'landing_tile_1_image';
            $fileKey = 'landing_tile_1_image';
            $urlKey = 'landing_tile_1_image';
        } elseif (isset($_FILES['landing_tile_2_image']) && $_FILES['landing_tile_2_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'landing_tile_2_image';
            $fileKey = 'landing_tile_2_image';
            $urlKey = 'landing_tile_2_image';
        } elseif (isset($_FILES['landing_tile_3_image']) && $_FILES['landing_tile_3_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'landing_tile_3_image';
            $fileKey = 'landing_tile_3_image';
            $urlKey = 'landing_tile_3_image';
        } elseif (isset($_FILES['landing_tile_4_image']) && $_FILES['landing_tile_4_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'landing_tile_4_image';
            $fileKey = 'landing_tile_4_image';
            $urlKey = 'landing_tile_4_image';
        } elseif (isset($_FILES['landing_tile_5_image']) && $_FILES['landing_tile_5_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'landing_tile_5_image';
            $fileKey = 'landing_tile_5_image';
            $urlKey = 'landing_tile_5_image';
        } elseif (isset($_FILES['landing_tile_6_image']) && $_FILES['landing_tile_6_image']['error'] === UPLOAD_ERR_OK) {
            $imageType = 'landing_tile_6_image';
            $fileKey = 'landing_tile_6_image';
            $urlKey = 'landing_tile_6_image';
        }
        
        // Handle file upload
        if ($imageType && $fileKey) {
            // Use uploadLogo for logos, or create a generic image upload method
            $upload = FileUploadService::uploadLogo($_FILES[$fileKey], $imageType);
            if ($upload['success']) {
                $url = $upload['url'];
                
                // Single image setting (all tiles are now single images)
                Setting::set($urlKey, $url, 'string', $user['id']);
                
                return ['success' => true, 'url' => $url];
            } else {
                http_response_code(400);
                return ['success' => false, 'error' => 'Upload failed: ' . $upload['error']];
            }
        }
        
        // Handle URL-based update
        foreach (['site_logo_url', 'header_logo_url', 'landing_bg_image_url', 'products_bg_image_url', 
                  'landing_tile_1_image', 'landing_tile_2_image', 'landing_tile_3_image', 
                  'landing_tile_4_image', 'landing_tile_5_image', 'landing_tile_6_image'] as $key) {
            if (isset($_POST[$key])) {
                $url = $_POST[$key];
                Setting::set($key, $url, 'string', $user['id']);
                return ['success' => true, 'url' => $url];
            }
        }
        
        http_response_code(400);
        return ['success' => false, 'error' => 'No file or URL provided'];
    }
}

