<?php

namespace App\Services;

/**
 * Webhook Service
 * Handles webhook signature verification for payment gateways
 */
class WebhookService
{
    /**
     * Verify Stripe webhook signature
     * @param string $payload Raw webhook payload
     * @param string $signature Stripe signature header
     * @param string $secret Webhook secret from Stripe dashboard
     * @return bool True if signature is valid
     */
    public static function verifyStripeSignature(string $payload, string $signature, string $secret): bool
    {
        if (empty($secret)) {
            error_log('Stripe webhook secret not configured');
            return false;
        }
        
        try {
            // Stripe sends signature in format: t=timestamp,v1=signature
            $elements = explode(',', $signature);
            $timestamp = null;
            $signatures = [];
            
            foreach ($elements as $element) {
                if (strpos($element, 't=') === 0) {
                    $timestamp = substr($element, 2);
                } elseif (strpos($element, 'v1=') === 0) {
                    $signatures[] = substr($element, 3);
                }
            }
            
            if (empty($timestamp) || empty($signatures)) {
                return false;
            }
            
            // Check timestamp (prevent replay attacks - allow 5 minute window)
            $currentTime = time();
            if (abs($currentTime - (int)$timestamp) > 300) {
                error_log('Stripe webhook timestamp too old or too far in future');
                return false;
            }
            
            // Compute expected signature
            $signedPayload = $timestamp . '.' . $payload;
            $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);
            
            // Compare signatures (use hash_equals to prevent timing attacks)
            foreach ($signatures as $signature) {
                if (hash_equals($expectedSignature, $signature)) {
                    return true;
                }
            }
            
            return false;
        } catch (\Exception $e) {
            error_log('Stripe webhook verification error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Verify Tabby webhook signature
     * @param string $payload Raw webhook payload
     * @param string $signature Tabby signature header
     * @param string $secret Webhook secret from Tabby dashboard
     * @return bool True if signature is valid
     */
    public static function verifyTabbySignature(string $payload, string $signature, string $secret): bool
    {
        if (empty($secret)) {
            error_log('Tabby webhook secret not configured');
            return false;
        }
        
        try {
            // Tabby uses HMAC SHA256
            $expectedSignature = hash_hmac('sha256', $payload, $secret);
            
            // Compare signatures (use hash_equals to prevent timing attacks)
            return hash_equals($expectedSignature, $signature);
        } catch (\Exception $e) {
            error_log('Tabby webhook verification error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get Stripe signature from headers
     */
    public static function getStripeSignature(): ?string
    {
        $headers = getallheaders();
        
        // Check various header formats
        if (isset($headers['Stripe-Signature'])) {
            return $headers['Stripe-Signature'];
        }
        
        if (isset($headers['stripe-signature'])) {
            return $headers['stripe-signature'];
        }
        
        // Check $_SERVER as fallback
        if (isset($_SERVER['HTTP_STRIPE_SIGNATURE'])) {
            return $_SERVER['HTTP_STRIPE_SIGNATURE'];
        }
        
        return null;
    }
    
    /**
     * Get Tabby signature from headers
     */
    public static function getTabbySignature(): ?string
    {
        $headers = getallheaders();
        
        // Check various header formats
        if (isset($headers['X-Tabby-Signature'])) {
            return $headers['X-Tabby-Signature'];
        }
        
        if (isset($headers['x-tabby-signature'])) {
            return $headers['x-tabby-signature'];
        }
        
        // Check $_SERVER as fallback
        if (isset($_SERVER['HTTP_X_TABBY_SIGNATURE'])) {
            return $_SERVER['HTTP_X_TABBY_SIGNATURE'];
        }
        
        return null;
    }
}







