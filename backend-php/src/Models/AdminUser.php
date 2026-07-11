<?php

namespace App\Models;

use App\Core\Database;

/**
 * Admin User Model
 * Handles admin user authentication and management
 */
class AdminUser
{
    /**
     * Find admin user by username
     */
    public static function findByUsername(string $username): ?array
    {
        $stmt = Database::query(
            "SELECT * FROM admin_users WHERE username = ? AND is_active = 1",
            [$username]
        );
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Find admin user by ID
     */
    public static function find(int $id): ?array
    {
        $stmt = Database::query(
            "SELECT id, username, email, role, is_active, last_login, created_at 
             FROM admin_users WHERE id = ? AND is_active = 1",
            [$id]
        );
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Find admin user by ID with password hash (for password verification)
     */
    public static function findWithPassword(int $id): ?array
    {
        $stmt = Database::query(
            "SELECT * FROM admin_users WHERE id = ? AND is_active = 1",
            [$id]
        );
        return $stmt->fetch() ?: null;
    }
    
    /**
     * Verify password
     */
    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }
    
    /**
     * Hash password
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT);
    }
    
    /**
     * Update last login timestamp
     */
    public static function updateLastLogin(int $id): void
    {
        Database::query(
            "UPDATE admin_users SET last_login = NOW() WHERE id = ?",
            [$id]
        );
    }
    
    /**
     * Create new admin user
     */
    public static function create(array $data): array
    {
        $passwordHash = self::hashPassword($data['password']);
        
        Database::query(
            "INSERT INTO admin_users (username, email, password_hash, role, is_active) 
             VALUES (?, ?, ?, ?, ?)",
            [
                $data['username'],
                $data['email'],
                $passwordHash,
                $data['role'] ?? 'staff',
                $data['is_active'] ?? 1,
            ]
        );
        
        $id = Database::getInstance()->lastInsertId();
        return self::find($id);
    }
    
    /**
     * Update admin user
     */
    public static function update(int $id, array $data): array
    {
        $updates = [];
        $params = [];
        
        if (isset($data['email'])) {
            $updates[] = "email = ?";
            $params[] = $data['email'];
        }
        
        if (isset($data['role'])) {
            $updates[] = "role = ?";
            $params[] = $data['role'];
        }
        
        if (isset($data['is_active'])) {
            $updates[] = "is_active = ?";
            $params[] = $data['is_active'] ? 1 : 0;
        }
        
        if (isset($data['password'])) {
            $updates[] = "password_hash = ?";
            $params[] = self::hashPassword($data['password']);
        }
        
        if (!empty($updates)) {
            $params[] = $id;
            Database::query(
                "UPDATE admin_users SET " . implode(', ', $updates) . " WHERE id = ?",
                $params
            );
        }
        
        return self::find($id);
    }
    
    /**
     * List all admin users
     */
    public static function all(): array
    {
        $stmt = Database::query(
            "SELECT id, username, email, role, is_active, last_login, created_at 
             FROM admin_users ORDER BY created_at DESC"
        );
        return $stmt->fetchAll();
    }
}


