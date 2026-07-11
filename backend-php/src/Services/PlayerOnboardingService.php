<?php

namespace App\Services;

use App\Models\Order;

/**
 * Player Onboarding Service
 * 
 * This service handles the integration point for sending player data
 * to the external player management app after successful order completion.
 * 
 * IMPORTANT: This is the API Integration Point
 * The client must provide the external app's API endpoint and authentication
 * details to complete this integration.
 * 
 * For now, this service logs the required data structure that needs to be sent.
 */
class PlayerOnboardingService
{
    /**
     * Send onboarding data to player management app
     * 
     * This method is called after a successful payment and order completion.
     * It prepares the player data and sends it to the external app.
     * 
     * @param array $order The completed order data
     * @return array Result of the onboarding process
     */
    public static function sendOnboardingData(array $order): array
    {
        // Prepare player data structure
        $playerData = self::preparePlayerData($order);
        
        // TODO: Replace this with actual API call to player management app
        // The client needs to provide:
        // 1. API endpoint URL
        // 2. Authentication method (API key, OAuth, etc.)
        // 3. Request format (JSON, XML, etc.)
        // 4. Required fields mapping
        
        // For now, log the data structure
        error_log('Player Onboarding Data: ' . json_encode($playerData, JSON_PRETTY_PRINT));
        
        // Example API call structure (commented out until client provides details):
        /*
        $apiUrl = $_ENV['PLAYER_APP_API_URL'] ?? '';
        $apiKey = $_ENV['PLAYER_APP_API_KEY'] ?? '';
        
        if (empty($apiUrl) || empty($apiKey)) {
            error_log('Player App API not configured');
            return ['success' => false, 'error' => 'API not configured'];
        }
        
        $ch = curl_init($apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($playerData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 || $httpCode === 201) {
            return ['success' => true, 'response' => json_decode($response, true)];
        } else {
            error_log('Player App API Error: ' . $response);
            return ['success' => false, 'error' => 'API call failed', 'response' => $response];
        }
        */
        
        // Return success for now (data is logged)
        return [
            'success' => true,
            'message' => 'Player data prepared (API integration pending)',
            'data' => $playerData,
        ];
    }
    
    /**
     * Prepare player data from order
     * 
     * Extracts and structures the necessary information for player onboarding
     * 
     * @param array $order The order data
     * @return array Structured player data
     */
    private static function preparePlayerData(array $order): array
    {
        // Get order items to determine which products/courses were purchased
        $items = $order['items'] ?? [];
        
        // Extract course information
        $courses = [];
        foreach ($items as $item) {
            $courses[] = [
                'product_id' => $item['product_id'],
                'product_name' => $item['product_name'] ?? '',
                'variant_id' => $item['variant_id'] ?? null,
                'variant_name' => $item['variant_name'] ?? null,
                'quantity' => $item['quantity'],
            ];
        }
        
        // Structure player data
        $playerData = [
            'order_number' => $order['order_number'],
            'order_id' => $order['id'],
            'player' => [
                'name' => $order['guest_name'],
                'email' => $order['guest_email'],
                'phone' => $order['guest_phone'],
            ],
            'courses' => $courses,
            'order_details' => [
                'total_amount' => $order['total_amount'],
                'currency' => $order['currency'],
                'payment_method' => $order['payment_method'],
                'payment_status' => $order['payment_status'],
                'order_date' => $order['created_at'],
            ],
        ];
        
        return $playerData;
    }
}


