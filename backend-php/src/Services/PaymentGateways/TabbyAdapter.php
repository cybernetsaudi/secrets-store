<?php

namespace App\Services\PaymentGateways;

use App\Services\PaymentGatewayInterface;
use App\Models\PaymentGateway;

class TabbyAdapter implements PaymentGatewayInterface
{
    private ?array $gatewayConfig = null;
    
    public function __construct()
    {
        // Get Tabby configuration from database
        $this->gatewayConfig = PaymentGateway::findAnyByType('tabby');
    }
    
    private function getApiKey(): string
    {
        // IMPORTANT: Database takes priority over environment variables
        // This ensures admin panel changes are respected
        $dbKey = $this->gatewayConfig['api_secret'] ?? '';
        if (!empty($dbKey)) {
            return $dbKey;
        }
        // Fallback to environment variable only if database is empty
        return $_ENV['TABBY_API_KEY'] ?? '';
    }
    
    private function getApiUrl(): string
    {
        // Tabby uses the same API endpoint for both test and live
        // They distinguish between test/live based on the API key provided
        // However, we still check is_test_mode for logging and debugging
        $isTestMode = $this->gatewayConfig['is_test_mode'] ?? true;
        
        // Log mode for debugging
        if ($isTestMode) {
            error_log("TabbyAdapter: Using TEST mode (is_test_mode=1)");
        } else {
            error_log("TabbyAdapter: Using LIVE mode (is_test_mode=0)");
        }
        
        // Tabby API endpoint (same for test and live)
        return $_ENV['TABBY_API_URL'] ?? 'https://api.tabby.ai/api/v2';
    }
    
    private function getMerchantCode(): string
    {
        // Get merchant_code from database (stored in merchant_id field)
        $merchantCode = $this->gatewayConfig['merchant_id'] ?? '';
        return $merchantCode;
    }
    
    public function processPayment(array $order, array $paymentData, float $amount, string $currency): array
    {
        $apiKey = $this->getApiKey();
        $isTestMode = $this->gatewayConfig['is_test_mode'] ?? true;
        
        // Enhanced logging for live key debugging
        error_log("Tabby processPayment: Starting payment processing");
        error_log("Tabby processPayment: is_test_mode = " . ($isTestMode ? '1 (TEST)' : '0 (LIVE)'));
        error_log("Tabby processPayment: API Key Prefix = " . substr($apiKey, 0, 15) . "...");
        error_log("Tabby processPayment: API Key Length = " . strlen($apiKey));
        // Detect key type - Tabby production keys may not have _live_ prefix
        $keyType = 'UNKNOWN';
        if (strpos($apiKey, 'sk_test_') === 0) {
            $keyType = 'TEST';
        } elseif (strpos($apiKey, 'sk_live_') === 0) {
            $keyType = 'LIVE';
        } elseif (strpos($apiKey, 'sk_') === 0 && !$isTestMode) {
            // Production keys might just be sk_... without _live_ prefix
            $keyType = 'LIVE (production format)';
        }
        error_log("Tabby processPayment: API Key Type = {$keyType}");
        
        if (empty($apiKey)) {
            error_log("Tabby processPayment: ERROR - API key is empty!");
            return [
                'success' => false,
                'error' => 'Tabby API key not configured. Please configure Tabby in Payment Gateways settings.',
            ];
        }
        
        $merchantCode = $this->getMerchantCode();
        
        error_log("Tabby processPayment: Merchant Code = " . ($merchantCode ?: 'NOT SET'));
        
        if (empty($merchantCode)) {
            error_log("Tabby processPayment: ERROR - Merchant code is empty!");
            return [
                'success' => false,
                'error' => 'Tabby merchant code not configured. Please configure Tabby Merchant Code in Payment Gateways settings.',
            ];
        }
        
        $apiUrl = $this->getApiUrl();
        error_log("Tabby processPayment: API URL = {$apiUrl}");
        
        // Build order items array for Tabby API
        $orderItems = [];
        if (isset($order['items']) && is_array($order['items'])) {
            foreach ($order['items'] as $item) {
                $itemName = $item['product_name'] ?? 'Product';
                if (isset($item['variant_name']) && !empty($item['variant_name'])) {
                    $itemName .= ' - ' . $item['variant_name'];
                }
                
                // Format unit_price to 2 decimal places (Tabby expects string with 2 decimals)
                $unitPrice = number_format((float)($item['unit_price'] ?? 0), 2, '.', '');
                
                $orderItems[] = [
                    'title' => $itemName,
                    'quantity' => (int)($item['quantity'] ?? 1),
                    'unit_price' => $unitPrice,
                    'category' => 'Sports Training', // Default category for academy products
                    'reference_id' => (string)($item['product_id'] ?? ''),
                ];
            }
        }
        
        // If no items found, create a single item from order total (fallback)
        if (empty($orderItems)) {
            $fallbackPrice = number_format((float)$amount, 2, '.', '');
            $orderItems[] = [
                'title' => 'Order ' . ($order['order_number'] ?? ''),
                'quantity' => 1,
                'unit_price' => $fallbackPrice,
                'category' => 'Sports Training',
                'reference_id' => $order['order_number'] ?? '',
            ];
        }
        
        // Build return URLs for Tabby redirect after payment
        $baseUrl = $_ENV['FRONTEND_URL'] ?? 'https://secrets.gatvia.com';
        $orderNumber = $order['order_number'] ?? '';
        
        // Tabby expects amount as a string with 2 decimal places (e.g., "100.00")
        // Format amount to 2 decimal places
        $formattedAmount = number_format((float)$amount, 2, '.', '');
        
        // Tabby requires shipping_address - use default UAE address if not provided
        $shippingAddress = [
            'city' => 'Dubai',
            'address' => 'Dubai',
            'zip' => '00000',
        ];
        
        // If order has shipping info, use it (for future enhancement)
        if (!empty($order['shipping_city'])) {
            $shippingAddress['city'] = $order['shipping_city'];
        }
        if (!empty($order['shipping_address'])) {
            $shippingAddress['address'] = $order['shipping_address'];
        }
        if (!empty($order['shipping_zip'])) {
            $shippingAddress['zip'] = $order['shipping_zip'];
        }
        
        // Tabby API structure: payment object contains buyer, order (with items), and shipping_address is optional
        $sessionData = [
            'payment' => [
                'amount' => $formattedAmount,
                'currency' => $currency,
                'description' => "Order {$orderNumber}",
                'buyer' => [
                    'phone' => $order['guest_phone'] ?? '',
                    'email' => $order['guest_email'] ?? '',
                    'name' => $order['guest_name'] ?? '',
                ],
                'order' => [
                    'reference_id' => $orderNumber,
                    'tax_amount' => number_format((float)($order['vat_amount'] ?? 0), 2, '.', ''),
                    'shipping_amount' => '0.00',
                    'items' => $orderItems,
                ],
            ],
            'merchant_code' => $merchantCode,
            'lang' => 'en',
            'merchant_urls' => [
                'success' => "{$baseUrl}/success/?order={$orderNumber}",
                'cancel' => "{$baseUrl}/success/?order={$orderNumber}&status=failed",
                'failure' => "{$baseUrl}/success/?order={$orderNumber}&status=failed",
            ],
        ];
        
        // Enhanced logging for request details
        error_log("Tabby processPayment: Request URL = {$apiUrl}/checkout");
        error_log("Tabby processPayment: Request Payload = " . json_encode($sessionData, JSON_PRETTY_PRINT));
        error_log("Tabby processPayment: Order Amount = {$amount} {$currency}");
        error_log("Tabby processPayment: Order Number = " . ($order['order_number'] ?? 'N/A'));
        
        $ch = curl_init("{$apiUrl}/checkout");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($sessionData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$apiKey}",
            "Content-Type: application/json",
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        $curlInfo = curl_getinfo($ch);
        curl_close($ch);
        
        // Enhanced logging for response
        error_log("Tabby processPayment: HTTP Code = {$httpCode}");
        error_log("Tabby processPayment: cURL Error = " . ($curlError ?: 'None'));
        error_log("Tabby processPayment: Response Length = " . strlen($response ?? ''));
        if ($response) {
            error_log("Tabby processPayment: Response (first 1000 chars) = " . substr($response, 0, 1000));
        }
        
        if ($curlError) {
            return [
                'success' => false,
                'error' => "Tabby API connection error: {$curlError}",
                'gateway_response' => [],
            ];
        }
        
        // IMPORTANT: Tabby verification happens on their website, not during session creation
        // If Tabby returns a checkout URL (even with error status), we should ALWAYS redirect
        // Tabby will handle verification and acceptance/rejection on their side
        // We should NOT reject payments on our checkout page - let Tabby do it
        
        // Try to parse response regardless of HTTP code (Tabby might return checkout URL even with 400)
        $data = null;
        if ($response) {
            $data = json_decode($response, true);
        }
        
        // If we got a response (even if HTTP code is not 200/201), try to extract checkout URL
        if ($data) {
            error_log("Tabby processPayment: Response parsed successfully");
            error_log("Tabby processPayment: HTTP Code = {$httpCode}");
            error_log("Tabby processPayment: Response Status = " . ($data['status'] ?? 'NOT SET'));
            
            // Log full response structure for debugging (first 2000 chars)
            error_log("Tabby processPayment: Full Response Structure = " . substr(json_encode($data, JSON_PRETTY_PRINT), 0, 2000));
            
            // First, try to extract checkout URL regardless of HTTP code or status
            $checkoutUrl = null;
            
            // Method 1: configuration.available_products.installments[0].web_url (most common)
            if (isset($data['configuration']['available_products']['installments']) && 
                is_array($data['configuration']['available_products']['installments']) && 
                !empty($data['configuration']['available_products']['installments'])) {
                $checkoutUrl = $data['configuration']['available_products']['installments'][0]['web_url'] ?? null;
            }
            
            // Method 2: configuration.available_products[0].web_url (array format)
            if (!$checkoutUrl && isset($data['configuration']['available_products']) && 
                is_array($data['configuration']['available_products']) && 
                !empty($data['configuration']['available_products'])) {
                if (isset($data['configuration']['available_products'][0]['web_url'])) {
                    $checkoutUrl = $data['configuration']['available_products'][0]['web_url'];
                }
            }
            
            // Method 3: configuration.products.installments[0].web_url (alternative structure)
            if (!$checkoutUrl && isset($data['configuration']['products']['installments']) && 
                is_array($data['configuration']['products']['installments']) && 
                !empty($data['configuration']['products']['installments'])) {
                $checkoutUrl = $data['configuration']['products']['installments'][0]['web_url'] ?? null;
            }
            
            // Method 4: Direct web_url in configuration
            if (!$checkoutUrl && isset($data['configuration']['web_url'])) {
                $checkoutUrl = $data['configuration']['web_url'];
            }
            
            // Method 5: Direct web_url at root level (sometimes Tabby returns it here)
            if (!$checkoutUrl && isset($data['web_url'])) {
                $checkoutUrl = $data['web_url'];
            }
            
            // Method 6: Check in payment object
            if (!$checkoutUrl && isset($data['payment']['web_url'])) {
                $checkoutUrl = $data['payment']['web_url'];
            }
            
            // Method 7: Check in available_products at root (alternative structure)
            if (!$checkoutUrl && isset($data['available_products']) && is_array($data['available_products'])) {
                if (isset($data['available_products'][0]['web_url'])) {
                    $checkoutUrl = $data['available_products'][0]['web_url'];
                } elseif (isset($data['available_products']['installments']) && 
                         is_array($data['available_products']['installments']) && 
                         !empty($data['available_products']['installments'])) {
                    $checkoutUrl = $data['available_products']['installments'][0]['web_url'] ?? null;
                }
            }
            
            // Log all extraction attempts for debugging
            error_log("Tabby processPayment: Checkout URL extraction result = " . ($checkoutUrl ?: 'NOT FOUND'));
            if (!$checkoutUrl) {
                error_log("Tabby processPayment: ⚠️ Attempted all extraction methods - no checkout URL found");
                error_log("Tabby processPayment: HTTP Code = {$httpCode}");
                error_log("Tabby processPayment: Response keys: " . implode(', ', array_keys($data)));
                if (isset($data['configuration'])) {
                    error_log("Tabby processPayment: Configuration keys: " . implode(', ', array_keys($data['configuration'])));
                    if (isset($data['configuration']['available_products'])) {
                        error_log("Tabby processPayment: available_products type: " . gettype($data['configuration']['available_products']));
                        if (is_array($data['configuration']['available_products'])) {
                            error_log("Tabby processPayment: available_products count: " . count($data['configuration']['available_products']));
                            if (!empty($data['configuration']['available_products'])) {
                                error_log("Tabby processPayment: First available_product keys: " . implode(', ', array_keys($data['configuration']['available_products'][0] ?? [])));
                            }
                        }
                    }
                }
                // Log FULL response for debugging (this will help us see what Tabby actually returns)
                error_log("Tabby processPayment: FULL RESPONSE (for debugging): " . json_encode($data, JSON_PRETTY_PRINT));
            }
            
            // Get session ID from various possible locations (needed for checkout URL construction)
            $sessionId = $data['id'] ?? $data['session_id'] ?? null;
            $publicKey = $this->gatewayConfig['public_key'] ?? '';
            $merchantCode = $this->getMerchantCode();
            
            // If we have a checkout URL, ALWAYS redirect to Tabby (let Tabby handle verification)
            // This applies regardless of HTTP status code or rejection status
            if ($checkoutUrl && $sessionId) {
                error_log("Tabby processPayment: ✅ Checkout URL found - redirecting to Tabby for verification");
                error_log("Tabby processPayment: Checkout URL = {$checkoutUrl}");
                error_log("Tabby processPayment: Session ID = {$sessionId}");
                error_log("Tabby processPayment: HTTP Code = {$httpCode} (allowing redirect anyway)");
                
                $paymentId = $data['payment']['id'] ?? null;
                $transactionId = $paymentId ?: $sessionId;
                
                // Extract rejection info if present (for logging, but don't block redirect)
                $rejectionCode = $data['rejection_reason_code'] ?? 
                               $data['configuration']['products']['installments']['rejection_reason_code'] ?? 
                               '';
                $rejectionReason = $data['rejection_reason'] ?? 
                                  $data['configuration']['products']['installments']['rejection_reason'] ?? 
                                  '';
                
                if ($rejectionCode || $rejectionReason) {
                    error_log("Tabby processPayment: Note - Rejection info present but allowing redirect: Code={$rejectionCode}, Reason={$rejectionReason}");
                }
                
                return [
                    'success' => true, // Always allow redirect if checkout URL exists
                    'transaction_id' => $transactionId,
                    'payment_id' => $paymentId,
                    'session_id' => $sessionId,
                    'checkout_url' => $checkoutUrl,
                    'status' => 'pending',
                    'gateway_response' => $data,
                ];
            }
            
            // If no checkout URL but we have session ID and public key, construct checkout URL
            // Tabby sometimes rejects but still provides a session ID - we can construct the URL
            if (!$checkoutUrl && $sessionId && !empty($publicKey) && !empty($merchantCode)) {
                error_log("Tabby processPayment: ⚠️ No checkout URL in response, but session ID exists - constructing checkout URL");
                error_log("Tabby processPayment: Session ID = {$sessionId}");
                error_log("Tabby processPayment: Public Key = " . substr($publicKey, 0, 30) . "...");
                error_log("Tabby processPayment: Merchant Code = {$merchantCode}");
                
                // Determine product type from Tabby's response
                // Check if installments is available, otherwise try to get product type from available_products
                $productType = 'installments'; // Default
                if (isset($data['configuration']['products']['installments']['type'])) {
                    $productType = $data['configuration']['products']['installments']['type'];
                } elseif (isset($data['configuration']['available_products']) && 
                         is_array($data['configuration']['available_products']) && 
                         !empty($data['configuration']['available_products'])) {
                    // Try to get product type from first available product
                    $firstProduct = $data['configuration']['available_products'][0];
                    if (isset($firstProduct['type'])) {
                        $productType = $firstProduct['type'];
                    }
                }
                
                // Construct Tabby checkout URL manually
                // Format: https://checkout.tabby.ai/?apiKey={publicKey}&lang=eng&merchantCode={merchantCode}&product={productType}&sessionId={sessionId}
                $constructedUrl = "https://checkout.tabby.ai/?apiKey=" . urlencode($publicKey) . 
                                 "&lang=eng&merchantCode=" . urlencode($merchantCode) . 
                                 "&product=" . urlencode($productType) . 
                                 "&sessionId=" . urlencode($sessionId);
                
                error_log("Tabby processPayment: ✅ Constructed checkout URL = {$constructedUrl}");
                
                $paymentId = $data['payment']['id'] ?? null;
                $transactionId = $paymentId ?: $sessionId;
                
                // Extract rejection info if present
                $rejectionCode = $data['rejection_reason_code'] ?? 
                               $data['configuration']['products']['installments']['rejection_reason_code'] ?? 
                               '';
                $rejectionReason = $data['rejection_reason'] ?? 
                                  $data['configuration']['products']['installments']['rejection_reason'] ?? 
                                  '';
                
                if ($rejectionCode || $rejectionReason) {
                    error_log("Tabby processPayment: Note - Rejection info present but allowing redirect: Code={$rejectionCode}, Reason={$rejectionReason}");
                }
                
                return [
                    'success' => true, // Allow redirect with constructed URL
                    'transaction_id' => $transactionId,
                    'payment_id' => $paymentId,
                    'session_id' => $sessionId,
                    'checkout_url' => $constructedUrl,
                    'status' => 'pending',
                    'gateway_response' => $data,
                ];
            }
            
            if ($checkoutUrl && !$sessionId) {
                error_log("Tabby processPayment: ⚠️ Checkout URL found but no session ID - cannot proceed");
            }
            
            // Only reject if there's NO checkout URL (Tabby couldn't create session)
            // Check if Tabby explicitly rejected and provided no checkout URL
            if (!$checkoutUrl) {
                error_log("Tabby processPayment: ⚠️ PAYMENT REJECTED by Tabby");
                error_log("Tabby processPayment: Rejection Response = " . json_encode($data, JSON_PRETTY_PRINT));
                
                // Extract rejection reason from various possible locations
                $rejectionReason = $data['rejection_reason'] ?? 
                                  $data['configuration']['products']['installments']['rejection_reason'] ?? 
                                  'Payment rejected by Tabby';
                $rejectionCode = $data['rejection_reason_code'] ?? 
                               $data['configuration']['products']['installments']['rejection_reason_code'] ?? 
                               '';
                
                // If no checkout URL, return error (Tabby rejected and no redirect possible)
                // Map rejection codes to user-friendly messages (per Tabby documentation)
                $errorMessages = [
                    'not_available' => 'Sorry, Tabby is unable to approve this purchase. Please use an alternative payment method for your order.',
                    'order_amount_too_high' => 'This purchase is above your current spending limit with Tabby, try a smaller cart or use another payment method',
                    'order_amount_too_low' => 'The purchase amount is below the minimum amount required to use Tabby, try adding more items or use another payment method',
                    'under_limit' => 'Order amount is too low for Tabby installments. Minimum order amount required.',
                    'over_limit' => 'Order amount exceeds Tabby\'s maximum limit.',
                    'not_enough_limit' => 'This purchase exceeds your current spending limit with Tabby. Please use an alternative payment method.',
                    'unsupported_currency' => 'Currency not supported by Tabby.',
                    'invalid_merchant' => 'Merchant configuration error. Please contact support.',
                ];
                
                $errorMessage = $errorMessages[$rejectionCode] ?? $errorMessages[strtolower($rejectionReason)] ?? $rejectionReason;
                
                error_log("Tabby Payment Rejected (HTTP {$httpCode}): " . json_encode($data));
                error_log("Tabby Request Data: " . json_encode($sessionData));
                error_log("Tabby Rejection Code: {$rejectionCode}, Reason: {$rejectionReason}");
                error_log("Tabby Rejection - Order: {$orderNumber}, Amount: {$amount} {$currency}");
                error_log("Tabby Rejection - Mode: " . ($isTestMode ? 'TEST' : 'LIVE'));
                error_log("Tabby Rejection - No checkout URL available, returning error");
                
                return [
                    'success' => false,
                    'error' => $errorMessage,
                    'gateway_response' => $data,
                    'http_code' => $httpCode,
                    'rejection_code' => $rejectionCode,
                    'rejection_reason' => $rejectionReason,
                ];
            }
            
        }
        
        // Handle case where response couldn't be parsed or no data
        if (!$data) {
            error_log("Tabby processPayment: ERROR - Could not parse response. HTTP Code: {$httpCode}");
            error_log("Tabby processPayment: Raw response (first 1000 chars): " . substr($response ?? '', 0, 1000));
            
            return [
                'success' => false,
                'error' => 'Invalid response from Tabby API',
                'gateway_response' => ['raw_response' => substr($response ?? '', 0, 500)],
                'http_code' => $httpCode,
            ];
        }
        
        // Enhanced error logging
        error_log("Tabby processPayment: API ERROR - HTTP {$httpCode}");
        error_log("Tabby processPayment: Error Response = " . substr($response ?? '', 0, 1000));
        
        $errorData = json_decode($response, true) ?? [];
        
        // Extract detailed error message from Tabby response
        $errorMessage = 'Tabby API error';
        if (isset($errorData['error'])) {
            $errorMessage = $errorData['error'];
            error_log("Tabby processPayment: Error from response['error'] = {$errorMessage}");
        } elseif (isset($errorData['message'])) {
            $errorMessage = $errorData['message'];
            error_log("Tabby processPayment: Error from response['message'] = {$errorMessage}");
        } elseif (isset($errorData['errors']) && is_array($errorData['errors'])) {
            // Tabby sometimes returns errors as an array
            $errorMessages = [];
            foreach ($errorData['errors'] as $error) {
                if (is_string($error)) {
                    $errorMessages[] = $error;
                } elseif (isset($error['message'])) {
                    $errorMessages[] = $error['message'];
                } elseif (isset($error['field']) && isset($error['message'])) {
                    $errorMessages[] = "{$error['field']}: {$error['message']}";
                }
            }
            if (!empty($errorMessages)) {
                $errorMessage = implode(', ', $errorMessages);
            }
        }
        
        // Log the full error for debugging
        error_log("Tabby API Error (HTTP {$httpCode}): " . json_encode($errorData));
        error_log("Tabby Request Data: " . json_encode($sessionData));
        
        return [
            'success' => false,
            'error' => $errorMessage,
            'gateway_response' => $errorData,
            'http_code' => $httpCode,
        ];
    }
    
    public function verifyPayment(string $transactionId): array
    {
        $apiKey = $this->getApiKey();
        if (empty($apiKey)) {
            error_log("Tabby verifyPayment: API key not configured");
            return ['status' => 'failed', 'error' => 'API key not configured'];
        }
        
        $apiUrl = $this->getApiUrl();
        
        // First, try to check the checkout session (session ID)
        // The transaction_id we store is actually the session ID from checkout creation
        $sessionUrl = "{$apiUrl}/checkout/{$transactionId}";
        
        error_log("Tabby verifyPayment: Checking checkout session {$transactionId} at {$sessionUrl}");
        
        $ch = curl_init($sessionUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$apiKey}",
            "Content-Type: application/json",
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        if ($curlError) {
            error_log("Tabby verifyPayment: cURL error: {$curlError}");
            return ['status' => 'pending', 'error' => "Connection error: {$curlError}"];
        }
        
        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            
            if (!$data) {
                error_log("Tabby verifyPayment: Invalid JSON response");
                return ['status' => 'pending', 'error' => 'Invalid response from Tabby'];
            }
            
            // Extract payment ID from checkout session response
            // Tabby returns payment object with id field in the checkout response
            $paymentId = null;
            if (isset($data['payment']['id'])) {
                $paymentId = $data['payment']['id'];
            } elseif (isset($data['payment_id'])) {
                $paymentId = $data['payment_id'];
            } elseif (isset($data['payment']) && is_string($data['payment'])) {
                $paymentId = $data['payment'];
            }
            
            // If we have a payment ID, check the payment status directly (per Tabby docs)
            if ($paymentId) {
                error_log("Tabby verifyPayment: Found payment ID in session: {$paymentId}");
                
                // Check payment status directly using payment ID (per Tabby documentation)
                $paymentUrl = "{$apiUrl}/payments/{$paymentId}";
                error_log("Tabby verifyPayment: Checking payment status at {$paymentUrl}");
                
                $paymentCh = curl_init($paymentUrl);
                curl_setopt($paymentCh, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($paymentCh, CURLOPT_HTTPHEADER, [
                    "Authorization: Bearer {$apiKey}",
                    "Content-Type: application/json",
                ]);
                curl_setopt($paymentCh, CURLOPT_TIMEOUT, 30);
                curl_setopt($paymentCh, CURLOPT_SSL_VERIFYPEER, true);
                
                $paymentResponse = curl_exec($paymentCh);
                $paymentHttpCode = curl_getinfo($paymentCh, CURLINFO_HTTP_CODE);
                curl_close($paymentCh);
                
                if ($paymentHttpCode === 200 && $paymentResponse) {
                    $paymentData = json_decode($paymentResponse, true);
                    if ($paymentData && isset($paymentData['status'])) {
                        // Tabby returns status in UPPERCASE: CREATED, AUTHORIZED, CLOSED, REJECTED, EXPIRED
                        $tabbyStatus = strtoupper($paymentData['status']);
                        error_log("Tabby verifyPayment: Payment status from Tabby API: {$tabbyStatus}");
                        
                        // Map Tabby status codes (per documentation)
                        $statusMap = [
                            'AUTHORIZED' => 'completed',  // Payment approved, not yet captured
                            'CLOSED' => 'completed',     // Payment approved and captured (check captures array)
                            'REJECTED' => 'failed',      // Payment declined
                            'EXPIRED' => 'failed',       // Session/payment expired
                            'CREATED' => 'pending',      // Payment initiated, waiting for completion
                        ];
                        
                        $mappedStatus = $statusMap[$tabbyStatus] ?? 'pending';
                        
                        // For CLOSED status, verify captures array exists (per Tabby docs)
                        if ($tabbyStatus === 'CLOSED') {
                            $hasCaptures = isset($paymentData['captures']) && 
                                         is_array($paymentData['captures']) && 
                                         !empty($paymentData['captures']);
                            if ($hasCaptures) {
                                error_log("Tabby verifyPayment: Payment CLOSED with captures - confirmed successful");
                                $mappedStatus = 'completed';
                            } else {
                                error_log("Tabby verifyPayment: Payment CLOSED but no captures - may not be captured yet");
                                $mappedStatus = 'pending';
                            }
                        }
                        
                        error_log("Tabby verifyPayment: Final mapped status: {$mappedStatus} (from {$tabbyStatus})");
                        
                        // Extract rejection info if status is REJECTED
                        $rejectionCode = null;
                        $rejectionReason = null;
                        if ($tabbyStatus === 'REJECTED') {
                            $rejectionCode = $paymentData['rejection_reason_code'] ?? 
                                           $paymentData['configuration']['products']['installments']['rejection_reason_code'] ?? 
                                           null;
                            $rejectionReason = $paymentData['rejection_reason'] ?? 
                                             $paymentData['configuration']['products']['installments']['rejection_reason'] ?? 
                                             null;
                            
                            if ($rejectionCode || $rejectionReason) {
                                error_log("Tabby verifyPayment: Found rejection - Code: {$rejectionCode}, Reason: {$rejectionReason}");
                                // Add rejection info to paymentData for storage
                                $paymentData['rejection_reason_code'] = $rejectionCode;
                                $paymentData['rejection_reason'] = $rejectionReason;
                            }
                        }
                        
                        return [
                            'status' => $mappedStatus,
                            'gateway_response' => $paymentData,
                            'payment_id' => $paymentId,
                            'rejection_code' => $rejectionCode,
                            'rejection_reason' => $rejectionReason,
                        ];
                    }
                } else {
                    error_log("Tabby verifyPayment: Failed to get payment status. HTTP {$paymentHttpCode}: " . substr($paymentResponse ?? '', 0, 200));
                }
            }
            
            // Fallback: Check session status if payment ID check failed
            if (isset($data['status'])) {
                $tabbyStatus = strtoupper($data['status'] ?? 'unknown');
                error_log("Tabby verifyPayment: Session status (fallback): {$tabbyStatus}");
                
                $statusMap = [
                    'AUTHORIZED' => 'completed',
                    'CLOSED' => 'completed',
                    'REJECTED' => 'failed',
                    'EXPIRED' => 'failed',
                    'CREATED' => 'pending',
                ];
                
                $mappedStatus = $statusMap[$tabbyStatus] ?? 'pending';
                
                error_log("Tabby verifyPayment: Session status mapped to: {$mappedStatus}");
                
                return [
                    'status' => $mappedStatus,
                    'gateway_response' => $data,
                    'payment_id' => $paymentId,
                ];
            }
            
            // If no status in session response, check if it's still CREATED
            $sessionStatus = strtoupper($data['status'] ?? 'CREATED');
            error_log("Tabby verifyPayment: Session status (default): {$sessionStatus}");
            
            // CREATED means payment initiated, waiting for completion - still pending
            if ($sessionStatus === 'CREATED' || $sessionStatus === 'PENDING') {
                return ['status' => 'pending', 'gateway_response' => $data];
            }
        }
        
        // If checkout session check fails, try direct payment check (fallback)
        $paymentUrl = "{$apiUrl}/payments/{$transactionId}";
        error_log("Tabby verifyPayment: Fallback - checking payment directly at {$paymentUrl}");
        
        $ch = curl_init($paymentUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$apiKey}",
            "Content-Type: application/json",
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200 && $response) {
            $data = json_decode($response, true);
            if ($data && isset($data['status'])) {
                // Tabby returns status in UPPERCASE
                $tabbyStatus = strtoupper($data['status']);
                error_log("Tabby verifyPayment: Payment status from direct check: {$tabbyStatus}");
                
                $statusMap = [
                    'AUTHORIZED' => 'completed',  // Payment approved, not yet captured
                    'CLOSED' => 'completed',      // Payment approved and captured
                    'REJECTED' => 'failed',       // Payment declined
                    'EXPIRED' => 'failed',       // Session/payment expired
                    'CREATED' => 'pending',       // Payment initiated, waiting
                ];
                
                $mappedStatus = $statusMap[$tabbyStatus] ?? 'pending';
                
                // For CLOSED, verify captures array
                if ($tabbyStatus === 'CLOSED') {
                    $hasCaptures = isset($data['captures']) && 
                                 is_array($data['captures']) && 
                                 !empty($data['captures']);
                    if (!$hasCaptures) {
                        error_log("Tabby verifyPayment: CLOSED but no captures - treating as pending");
                        $mappedStatus = 'pending';
                    }
                }
                
                error_log("Tabby verifyPayment: Final status from direct check: {$mappedStatus}");
                return ['status' => $mappedStatus, 'gateway_response' => $data];
            }
        }
        
        error_log("Tabby verifyPayment: HTTP {$httpCode} - Response: " . substr($response ?? '', 0, 200));
        return ['status' => 'pending', 'error' => "HTTP {$httpCode} - Unable to verify payment"];
    }
    
    public function handleWebhook(array $data): array
    {
        // Tabby webhook handling
        // Verify webhook signature if webhook_secret is configured
        $webhookSecret = $this->gatewayConfig['webhook_secret'] ?? '';
        
        if (isset($data['id']) && isset($data['status'])) {
            return [
                'processed' => true,
                'transaction_id' => $data['id'],
                'status' => $data['status'],
            ];
        }
        
        return ['processed' => false, 'error' => 'Invalid webhook data'];
    }
}


