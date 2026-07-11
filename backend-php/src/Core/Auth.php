<?php

namespace App\Core;

use App\Models\AdminUser;

/**
 * Authentication Middleware
 * Handles admin session management and authentication
 */
class Auth
{
    /**
     * Start session if not already started
     */
    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            // Set secure session cookie parameters
            $isSecure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on';
            
            // Use ini_set for better compatibility (some PHP versions)
            ini_set('session.cookie_lifetime', '1800'); // 30 minutes
            ini_set('session.cookie_path', '/');
            ini_set('session.cookie_domain', '');
            ini_set('session.cookie_secure', $isSecure ? '1' : '0');
            ini_set('session.cookie_httponly', '1');
            ini_set('session.cookie_samesite', 'Strict');
            
            // Also use session_set_cookie_params for compatibility
            session_set_cookie_params([
                'lifetime' => 1800, // 30 minutes (session timeout)
                'path' => '/',
                'domain' => '', // Use current domain
                'secure' => $isSecure,
                'httponly' => true,
                'samesite' => 'Strict' // Strict for CSRF protection
            ]);
            
            session_start();
        }
    }
    
    /**
     * Check if user is authenticated
     */
    public static function check(): bool
    {
        self::startSession();
        
        if (!isset($_SESSION['admin_user_id']) || empty($_SESSION['admin_user_id'])) {
            return false;
        }
        
        // Check session timeout (30 minutes inactivity)
        $timeout = 1800; // 30 minutes in seconds
        if (isset($_SESSION['admin_last_activity'])) {
            if (time() - $_SESSION['admin_last_activity'] > $timeout) {
                // Session expired
                session_destroy();
                $_SESSION = [];
                return false;
            }
        }
        
        // Update last activity time
        $_SESSION['admin_last_activity'] = time();
        
        return true;
    }
    
    /**
     * Get current authenticated user
     */
    public static function user(): ?array
    {
        if (!self::check()) {
            return null;
        }
        
        return AdminUser::find($_SESSION['admin_user_id']);
    }
    
    /**
     * Login user
     */
    public static function login(string $username, string $password): array
    {
        self::startSession();
        
        $user = AdminUser::findByUsername($username);
        
        if (!$user) {
            return ['success' => false, 'error' => 'Invalid credentials'];
        }
        
        if (!AdminUser::verifyPassword($password, $user['password_hash'])) {
            return ['success' => false, 'error' => 'Invalid credentials'];
        }
        
        // Regenerate session ID on login to prevent session fixation
        session_regenerate_id(true);
        
        // Set session
        $_SESSION['admin_user_id'] = $user['id'];
        $_SESSION['admin_username'] = $user['username'];
        $_SESSION['admin_role'] = $user['role'];
        $_SESSION['admin_logged_in_at'] = time();
        $_SESSION['admin_last_activity'] = time();
        
        // Update last login
        AdminUser::updateLastLogin($user['id']);
        
        return [
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
        ];
    }
    
    /**
     * Logout user
     */
    public static function logout(): void
    {
        self::startSession();
        session_destroy();
        $_SESSION = [];
    }
    
    /**
     * Require authentication (middleware)
     */
    public static function requireAuth(): void
    {
        if (!self::check()) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Unauthorized', 'requires_login' => true]);
            exit;
        }
    }
    
    /**
     * Require admin role
     */
    public static function requireAdmin(): void
    {
        self::requireAuth();
        
        $user = self::user();
        if ($user['role'] !== 'admin') {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Forbidden - Admin access required']);
            exit;
        }
    }
    
    /**
     * Generate CSRF token
     */
    public static function generateCsrfToken(): string
    {
        self::startSession();
        
        // Generate random token
        if (function_exists('random_bytes')) {
            $token = bin2hex(random_bytes(32));
        } else {
            // Fallback for older PHP versions
            $token = bin2hex(openssl_random_pseudo_bytes(32));
        }
        
        $_SESSION['csrf_token'] = $token;
        return $token;
    }
    
    /**
     * Get current CSRF token (regenerate if missing)
     */
    public static function getCsrfToken(): string
    {
        self::startSession();
        
        if (!isset($_SESSION['csrf_token']) || empty($_SESSION['csrf_token'])) {
            return self::generateCsrfToken();
        }
        
        return $_SESSION['csrf_token'];
    }
    
    /**
     * Validate CSRF token
     * @param string|null $token Token from request (can be in header or body)
     * @return bool True if valid, false otherwise
     */
    public static function validateCsrfToken(?string $token = null): bool
    {
        self::startSession();
        
        // Get token from various sources
        if (empty($token)) {
            // Check X-CSRF-Token header
            $headers = getallheaders();
            if (isset($headers['X-CSRF-Token'])) {
                $token = $headers['X-CSRF-Token'];
            } elseif (isset($headers['x-csrf-token'])) {
                $token = $headers['x-csrf-token'];
            } elseif (isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
                $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
            } elseif (isset($_POST['csrf_token'])) {
                $token = $_POST['csrf_token'];
            } elseif (isset($_POST['_token'])) {
                $token = $_POST['_token'];
            } else {
                // Try to get from JSON body
                $rawInput = file_get_contents('php://input');
                if (!empty($rawInput)) {
                    $data = json_decode($rawInput, true);
                    if (isset($data['csrf_token'])) {
                        $token = $data['csrf_token'];
                    } elseif (isset($data['_token'])) {
                        $token = $data['_token'];
                    }
                }
            }
        }
        
        // No token provided
        if (empty($token)) {
            return false;
        }
        
        // No token in session
        if (!isset($_SESSION['csrf_token']) || empty($_SESSION['csrf_token'])) {
            return false;
        }
        
        // Compare tokens using hash_equals to prevent timing attacks
        return hash_equals($_SESSION['csrf_token'], $token);
    }
    
    /**
     * Require valid CSRF token (middleware)
     * Call this before processing state-changing requests (POST, PUT, DELETE)
     * 
     * Can be disabled via environment variable CSRF_ENABLED=false for emergency rollback
     */
    public static function requireCsrfToken(): void
    {
        // Allow disabling CSRF via environment variable (for emergency rollback)
        $csrfEnabled = $_ENV['CSRF_ENABLED'] ?? 'true';
        if ($csrfEnabled === 'false' || $csrfEnabled === '0') {
            return; // CSRF disabled - skip validation
        }
        
        if (!self::validateCsrfToken()) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Invalid or missing CSRF token',
                'csrf_required' => true,
                'message' => 'CSRF token validation failed. Please refresh the page and try again.',
            ]);
            exit;
        }
    }
}

