<?php

namespace App\Services;

/**
 * Encryption Service
 * Handles secure encryption/decryption of sensitive data using AES-256-CBC
 */
class EncryptionService
{
    private const CIPHER = 'AES-256-CBC';
    private const KEY_LENGTH = 32; // 256 bits
    
    /**
     * Get encryption key from environment or generate one
     */
    private static function getKey(): string
    {
        $key = $_ENV['ENCRYPTION_KEY'] ?? getenv('ENCRYPTION_KEY');
        
        if (empty($key)) {
            // Generate a key if not set (should be set in production)
            $key = hash('sha256', 'default_key_change_in_production_' . __DIR__);
            error_log('WARNING: Using default encryption key. Set ENCRYPTION_KEY in .env for production!');
        }
        
        // Ensure key is exactly 32 bytes
        if (strlen($key) < self::KEY_LENGTH) {
            $key = hash('sha256', $key);
        }
        
        return substr($key, 0, self::KEY_LENGTH);
    }
    
    /**
     * Encrypt data
     * @param string $data Data to encrypt
     * @return string Encrypted data (base64 encoded with IV prepended)
     */
    public static function encrypt(string $data): string
    {
        if (empty($data)) {
            return '';
        }
        
        $key = self::getKey();
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length(self::CIPHER));
        
        $encrypted = openssl_encrypt($data, self::CIPHER, $key, 0, $iv);
        
        if ($encrypted === false) {
            throw new \Exception('Encryption failed');
        }
        
        // Prepend IV to encrypted data and base64 encode
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt data
     * @param string $encryptedData Encrypted data (base64 encoded with IV prepended)
     * @return string Decrypted data
     */
    public static function decrypt(string $encryptedData): string
    {
        if (empty($encryptedData)) {
            return '';
        }
        
        $key = self::getKey();
        $data = base64_decode($encryptedData, true);
        
        if ($data === false) {
            throw new \Exception('Invalid encrypted data format');
        }
        
        $ivLength = openssl_cipher_iv_length(self::CIPHER);
        $iv = substr($data, 0, $ivLength);
        $encrypted = substr($data, $ivLength);
        
        $decrypted = openssl_decrypt($encrypted, self::CIPHER, $key, 0, $iv);
        
        if ($decrypted === false) {
            throw new \Exception('Decryption failed');
        }
        
        return $decrypted;
    }
    
    /**
     * Check if string is encrypted (starts with base64 pattern)
     * This is a simple heuristic - encrypted data is base64 encoded
     */
    public static function isEncrypted(string $data): bool
    {
        if (empty($data)) {
            return false;
        }
        
        // Check if it's base64 encoded and has minimum length
        // Encrypted data with IV will be at least 16+ bytes when decoded
        if (base64_decode($data, true) !== false) {
            $decoded = base64_decode($data, true);
            return strlen($decoded) >= 16; // IV (16 bytes) + some encrypted data
        }
        
        return false;
    }
}







