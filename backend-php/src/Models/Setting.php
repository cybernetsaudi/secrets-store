<?php

namespace App\Models;

use App\Core\Database;

/**
 * Settings Model
 * Manages application settings (email config, etc.)
 */
class Setting
{
    /**
     * Get setting value by key
     */
    public static function get(string $key, $default = null)
    {
        $stmt = Database::query("SELECT value, type FROM settings WHERE `key` = ?", [$key]);
        $setting = $stmt->fetch();
        
        if (!$setting) {
            return $default;
        }
        
        // Convert based on type
        switch ($setting['type']) {
            case 'boolean':
                return (bool)$setting['value'];
            case 'number':
                return is_numeric($setting['value']) ? (float)$setting['value'] : $default;
            case 'json':
                return json_decode($setting['value'], true) ?: $default;
            default:
                return $setting['value'];
        }
    }
    
    /**
     * Set setting value
     */
    public static function set(string $key, $value, string $type = 'string', ?int $updatedBy = null): void
    {
        // Convert value based on type
        $dbValue = $value;
        if ($type === 'json') {
            $dbValue = json_encode($value);
        } elseif ($type === 'boolean') {
            $dbValue = $value ? '1' : '0';
        } else {
            $dbValue = (string)$value;
        }
        
        Database::query(
            "INSERT INTO settings (`key`, `value`, `type`, `updated_by`) 
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             `value` = VALUES(`value`), 
             `type` = VALUES(`type`), 
             `updated_by` = VALUES(`updated_by`),
             `updated_at` = NOW()",
            [$key, $dbValue, $type, $updatedBy]
        );
    }
    
    /**
     * Get all settings
     */
    public static function all(): array
    {
        $stmt = Database::query("SELECT * FROM settings ORDER BY `key`");
        $settings = $stmt->fetchAll();
        
        foreach ($settings as &$setting) {
            // Convert based on type
            switch ($setting['type']) {
                case 'boolean':
                    $setting['value'] = (bool)$setting['value'];
                    break;
                case 'number':
                    $setting['value'] = is_numeric($setting['value']) ? (float)$setting['value'] : 0;
                    break;
                case 'json':
                    $setting['value'] = json_decode($setting['value'], true) ?: [];
                    break;
            }
        }
        
        return $settings;
    }
    
    /**
     * Delete setting
     */
    public static function delete(string $key): void
    {
        Database::query("DELETE FROM settings WHERE `key` = ?", [$key]);
    }
}


