<?php

namespace App\Controllers;

use App\Core\Auth;

/**
 * Admin Authentication Controller
 * Handles admin login/logout
 */
class AdminAuthController
{
    /**
     * Admin login endpoint
     * POST /api/admin/login
     */
    public function login(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['username']) || empty($data['password'])) {
            http_response_code(400);
            return ['error' => 'Username and password are required'];
        }
        
        $result = Auth::login($data['username'], $data['password']);
        
        if (!$result['success']) {
            http_response_code(401);
            return $result;
        }
        
        return $result;
    }
    
    /**
     * Admin logout endpoint
     * POST /api/admin/logout
     */
    public function logout(): array
    {
        Auth::logout();
        return ['success' => true, 'message' => 'Logged out successfully'];
    }
    
    /**
     * Get current user info
     * GET /api/admin/me
     */
    public function me(): array
    {
        Auth::requireAuth();
        
        $user = Auth::user();
        return [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role'],
            'csrf_token' => Auth::getCsrfToken(),
        ];
    }
    
    /**
     * Change password endpoint
     * PUT /api/admin/change-password
     */
    public function changePassword(): array
    {
        Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (empty($data['current_password']) || empty($data['new_password'])) {
            http_response_code(400);
            return ['error' => 'Current password and new password are required'];
        }
        
        if (strlen($data['new_password']) < 8) {
            http_response_code(400);
            return ['error' => 'New password must be at least 8 characters long'];
        }
        
        $user = Auth::user();
        $adminUser = \App\Models\AdminUser::findWithPassword($user['id']);
        
        if (!$adminUser) {
            http_response_code(404);
            return ['error' => 'User not found'];
        }
        
        // Verify current password
        if (!\App\Models\AdminUser::verifyPassword($data['current_password'], $adminUser['password_hash'])) {
            http_response_code(401);
            return ['error' => 'Current password is incorrect'];
        }
        
        // Update password
        \App\Models\AdminUser::update($user['id'], ['password' => $data['new_password']]);
        
        return ['success' => true, 'message' => 'Password changed successfully'];
    }
}


