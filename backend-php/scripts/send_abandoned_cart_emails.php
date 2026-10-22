<?php

/**
 * Abandoned Cart Email Reminder Script
 * 
 * This script should be run as a cron job (hourly recommended)
 * 
 * Cron setup example:
 * 0 * * * * /usr/bin/php /path/to/scripts/send_abandoned_cart_emails.php
 * 
 * Or for Hostinger:
 * Add to cPanel Cron Jobs: php /home/username/domains/secrets.gatvia.com/public_html/api/scripts/send_abandoned_cart_emails.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Database;
use App\Models\AbandonedCart;
use App\Models\Setting;

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

// Initialize database
try {
    Database::getInstance();
} catch (Exception $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    exit(1);
}

/**
 * Send abandoned cart reminder email
 */
function sendAbandonedCartEmail(array $cart): bool
{
    $email = $cart['guest_email'];
    $name = $cart['guest_name'] ?? 'Valued Customer';
    $cartData = $cart['cart_data'] ?? [];
    
    // Get email settings
    $from = Setting::get('email_from', 'noreply@secrets.gatvia.com');
    $host = Setting::get('email_host', '');
    $port = Setting::get('email_port', '587');
    $username = Setting::get('email_username', '');
    $encryptedPassword = Setting::get('email_password', '');
    $password = $encryptedPassword ? base64_decode($encryptedPassword) : '';
    
    // Build email content
    $brandName = Setting::get('email_from_name', 'GATVIA Secrets');
    $subject = "Complete your {$brandName} order";
    $cartUrl = 'https://secrets.gatvia.com/cart/';
    
    $message = "Hello {$name},\n\n";
    $message .= "We noticed you started shopping at {$brandName} but didn't complete your purchase.\n\n";
    $message .= "Your cart is still waiting for you!\n\n";
    
    if (!empty($cartData)) {
        $message .= "Items in your cart:\n";
        foreach ($cartData as $item) {
            $productName = $item['product']['name'] ?? 'Product';
            $variantName = $item['variant']['name'] ?? '';
            $quantity = $item['quantity'] ?? 1;
            $price = $item['totalPrice'] ?? 0;
            
            $message .= "- {$productName}";
            if ($variantName) {
                $message .= " ({$variantName})";
            }
            $message .= " x{$quantity} - {$price}\n";
        }
    }
    
    $message .= "\n";
    $message .= "Complete your purchase now: {$cartUrl}\n\n";
    $message .= "Thank you for shopping with {$brandName}!\n\n";
    $message .= "Best regards,\n";
    $message .= "{$brandName} Team";
    
    // Send email
    $headers = "From: {$from}\r\n";
    $headers .= "Reply-To: {$from}\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    $result = @mail($email, $subject, $message, $headers);
    
    return $result;
}

// Get carts that need reminders (abandoned > 6 hours)
$carts = AbandonedCart::getCartsNeedingReminder(6);

$sent = 0;
$failed = 0;

foreach ($carts as $cart) {
    if (sendAbandonedCartEmail($cart)) {
        AbandonedCart::markReminderSent($cart['id']);
        $sent++;
    } else {
        $failed++;
        error_log("Failed to send abandoned cart email to: {$cart['guest_email']}");
    }
}

// Log results
error_log("Abandoned cart emails sent: {$sent}, failed: {$failed}");

// Cleanup old recovered carts (older than 90 days)
$deleted = AbandonedCart::cleanupOldCarts(90);
if ($deleted > 0) {
    error_log("Cleaned up {$deleted} old abandoned cart records");
}

echo "Processed {$sent} abandoned cart reminders\n";
exit(0);


