<?php

namespace App\Services;

/**
 * Validation Service
 * Provides input validation and sanitization
 */
class ValidationService
{
    /**
     * Validate email
     */
    public static function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Sanitize string
     */
    public static function sanitizeString(string $input, int $maxLength = 1000): string
    {
        $sanitized = trim($input);
        $sanitized = strip_tags($sanitized);
        $sanitized = htmlspecialchars($sanitized, ENT_QUOTES, 'UTF-8');
        
        if (strlen($sanitized) > $maxLength) {
            $sanitized = substr($sanitized, 0, $maxLength);
        }
        
        return $sanitized;
    }
    
    /**
     * Validate and sanitize integer
     */
    public static function validateInt($value, int $min = null, int $max = null): ?int
    {
        $int = filter_var($value, FILTER_VALIDATE_INT);
        
        if ($int === false) {
            return null;
        }
        
        if ($min !== null && $int < $min) {
            return null;
        }
        
        if ($max !== null && $int > $max) {
            return null;
        }
        
        return $int;
    }
    
    /**
     * Validate and sanitize float
     */
    public static function validateFloat($value, float $min = null, float $max = null): ?float
    {
        $float = filter_var($value, FILTER_VALIDATE_FLOAT);
        
        if ($float === false) {
            return null;
        }
        
        if ($min !== null && $float < $min) {
            return null;
        }
        
        if ($max !== null && $float > $max) {
            return null;
        }
        
        return $float;
    }
    
    /**
     * Validate URL
     */
    public static function validateUrl(string $url): bool
    {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    /**
     * Validate phone number (basic)
     */
    public static function validatePhone(string $phone): bool
    {
        // Remove common phone number characters
        $cleaned = preg_replace('/[^0-9+]/', '', $phone);
        return strlen($cleaned) >= 8 && strlen($cleaned) <= 20;
    }
    
    /**
     * Validate required fields
     */
    public static function validateRequired(array $data, array $required): array
    {
        $errors = [];
        
        foreach ($required as $field) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $errors[] = "Field '{$field}' is required";
            }
        }
        
        return $errors;
    }
    
    /**
     * Sanitize array recursively
     */
    public static function sanitizeArray(array $data): array
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            $sanitizedKey = self::sanitizeString($key, 100);
            
            if (is_array($value)) {
                $sanitized[$sanitizedKey] = self::sanitizeArray($value);
            } elseif (is_string($value)) {
                $sanitized[$sanitizedKey] = self::sanitizeString($value);
            } else {
                $sanitized[$sanitizedKey] = $value;
            }
        }
        
        return $sanitized;
    }
}







