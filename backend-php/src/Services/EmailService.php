<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\Order;
use App\Services\EncryptionService;

/**
 * Email Service
 * Handles sending all types of emails (order confirmations, notifications, etc.)
 */
class EmailService
{
    /**
     * Send order confirmation email to customer
     */
    public static function sendOrderConfirmation(array $order): bool
    {
        $orderData = $order;
        $orderItems = Order::getItems($orderData['id']);
        
        $subject = "Order Confirmation - {$orderData['order_number']}";
        $message = self::buildOrderConfirmationTemplate($orderData, $orderItems);
        
        return self::sendEmail(
            $orderData['guest_email'],
            $subject,
            $message,
            $orderData['guest_name']
        );
    }
    
    /**
     * Send admin notification for new order
     */
    public static function sendAdminNotification(array $order): bool
    {
        $orderData = $order;
        $orderItems = Order::getItems($orderData['id']);
        // Always take staff email from settings table; no hardcoded fallback
        $staffEmail = Setting::get('staff_email', '');
        if (empty($staffEmail)) {
            // If not configured, do not attempt to send
            error_log('EmailService: staff_email setting is empty - admin notification not sent');
            return false;
        }
        
        $subject = "New Order - {$orderData['order_number']}";
        $message = self::buildAdminNotificationTemplate($orderData, $orderItems);
        
        return self::sendEmail($staffEmail, $subject, $message);
    }
    
    /**
     * Build order confirmation email template
     * Redesigned to match website's dark theme and glassmorphism style
     */
    private static function buildOrderConfirmationTemplate(array $order, array $items): string
    {
        // Contact email for footer: prefer staff_email, fall back to email_from if set
        $contactEmail = Setting::get('staff_email', '');
        if (empty($contactEmail)) {
            $contactEmail = Setting::get('email_from', '');
        }
        $itemsHtml = '';
        foreach ($items as $item) {
            $variantName = $item['variant_name'] ?: 'N/A';
            $itemsHtml .= "<tr style='border-bottom: 1px solid rgba(120, 113, 108, 0.3);'>
                <td style='padding: 12px; color: #ffffff;'>{$item['product_name']}</td>
                <td style='padding: 12px; color: #d6d3d1;'>{$variantName}</td>
                <td style='padding: 12px; color: #ffffff; text-align: center;'>{$item['quantity']}</td>
                <td style='padding: 12px; color: #ffffff; text-align: right;'>{$order['currency']} " . number_format($item['unit_price'], 2) . "</td>
                <td style='padding: 12px; color: #ffffff; text-align: right; font-weight: 600;'>{$order['currency']} " . number_format($item['total_price'], 2) . "</td>
            </tr>";
        }
        
        $contactLine = $contactEmail
            ? "<p style='margin: 8px 0; color: #d6d3d1;'>If you have any questions, please contact us at <a href='mailto:{$contactEmail}' style='color: #DC143C; text-decoration: none;'>{$contactEmail}</a></p>"
            : "<p style='margin: 8px 0; color: #d6d3d1;'>If you have any questions, please contact us.</p>";

        $orderDate = date('F j, Y g:i A', strtotime($order['created_at']));
        $statusBadgeColor = $order['status'] === 'completed' ? '#10b981' : ($order['status'] === 'paid' ? '#3b82f6' : '#eab308');
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                    background-color: #111827; 
                    color: #ffffff;
                }
                .email-wrapper { 
                    background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(0, 51, 102, 0.1) 50%, rgba(17, 24, 39, 0.95) 100%);
                    padding: 40px 20px;
                    min-height: 100vh;
                }
                .email-container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: rgba(41, 37, 36, 0.8);
                    border: 1px solid rgba(120, 113, 108, 0.3);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                }
                .header { 
                    background: linear-gradient(135deg, rgba(220, 20, 60, 0.9) 0%, rgba(0, 51, 102, 0.9) 100%);
                    padding: 32px 24px;
                    text-align: center;
                }
                .header h1 { 
                    margin: 0 0 8px 0; 
                    font-size: 28px; 
                    font-weight: 700; 
                    color: #ffffff;
                }
                .header p { 
                    margin: 0; 
                    font-size: 16px; 
                    color: rgba(255, 255, 255, 0.9);
                }
                .content { 
                    padding: 24px; 
                    background: transparent;
                }
                .card { 
                    background: rgba(68, 64, 60, 0.4);
                    border: 1px solid rgba(120, 113, 108, 0.3);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 16px;
                }
                .card h2 { 
                    margin: 0 0 16px 0; 
                    font-size: 20px; 
                    font-weight: 600; 
                    color: #ffffff;
                    border-bottom: 1px solid rgba(120, 113, 108, 0.3);
                    padding-bottom: 12px;
                }
                .info-row { 
                    margin: 12px 0; 
                    color: #d6d3d1;
                }
                .info-row strong { 
                    color: #ffffff; 
                    font-weight: 600;
                }
                .status-badge {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 600;
                    background-color: {$statusBadgeColor}20;
                    color: {$statusBadgeColor};
                    border: 1px solid {$statusBadgeColor}30;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 16px 0;
                }
                th { 
                    background: rgba(68, 64, 60, 0.6);
                    padding: 12px;
                    text-align: left;
                    font-weight: 600;
                    color: #ffffff;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 2px solid rgba(120, 113, 108, 0.3);
                }
                .summary-row {
                    margin: 12px 0;
                    padding: 8px 0;
                    border-top: 1px solid rgba(120, 113, 108, 0.2);
                }
                .summary-row.total {
                    border-top: 2px solid rgba(220, 20, 60, 0.5);
                    margin-top: 16px;
                    padding-top: 16px;
                }
                .summary-row strong {
                    color: #ffffff;
                    font-weight: 600;
                }
                .total-amount {
                    font-size: 24px;
                    font-weight: 700;
                    color: #DC143C;
                }
                .footer { 
                    text-align: center; 
                    padding: 24px; 
                    background: rgba(41, 37, 36, 0.6);
                    border-top: 1px solid rgba(120, 113, 108, 0.3);
                }
                .footer p { 
                    margin: 8px 0; 
                    color: #a8a29e; 
                    font-size: 13px;
                }
                .footer .brand {
                    color: #ffffff;
                    font-weight: 600;
                    font-size: 16px;
                }
            </style>
        </head>
        <body>
            <div class='email-wrapper'>
                <div class='email-container'>
                    <div class='header'>
                        <h1>Order Confirmation</h1>
                        <p>Thank you for your purchase!</p>
                    </div>
                    <div class='content'>
                        <div class='card'>
                            <h2>Order Details</h2>
                            <div class='info-row'><strong>Order Number:</strong> {$order['order_number']}</div>
                            <div class='info-row'><strong>Order Date:</strong> {$orderDate}</div>
                            <div class='info-row'><strong>Status:</strong> <span class='status-badge'>{$order['status']}</span></div>
                        </div>
                        
                        <div class='card'>
                            <h2>Order Items</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Variant</th>
                                        <th style='text-align: center;'>Qty</th>
                                        <th style='text-align: right;'>Unit Price</th>
                                        <th style='text-align: right;'>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {$itemsHtml}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class='card'>
                            <h2>Order Summary</h2>
                            <div class='summary-row'>
                                <div style='display: flex; justify-content: space-between;'>
                                    <span style='color: #d6d3d1;'>Subtotal:</span>
                                    <strong>{$order['currency']} " . number_format($order['subtotal'], 2) . "</strong>
                                </div>
                            </div>
                            " . ($order['discount_amount'] > 0 ? "
                            <div class='summary-row'>
                                <div style='display: flex; justify-content: space-between;'>
                                    <span style='color: #10b981;'>Discount:</span>
                                    <strong style='color: #10b981;'>-{$order['currency']} " . number_format($order['discount_amount'], 2) . "</strong>
                                </div>
                            </div>
                            " : "") . "
                            <div class='summary-row'>
                                <div style='display: flex; justify-content: space-between;'>
                                    <span style='color: #d6d3d1;'>VAT (5%):</span>
                                    <strong>{$order['currency']} " . number_format($order['vat_amount'], 2) . "</strong>
                                </div>
                            </div>
                            <div class='summary-row total'>
                                <div style='display: flex; justify-content: space-between; align-items: center;'>
                                    <strong style='font-size: 18px;'>Total:</strong>
                                    <span class='total-amount'>{$order['currency']} " . number_format($order['total_amount'], 2) . "</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class='footer'>
                        <p class='brand'>Gulf United FC - Academy Store</p>
                        {$contactLine}
                        <p style='margin-top: 16px; color: #78716c; font-size: 11px;'>This is an automated email. Please do not reply directly.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * Build admin notification email template
     * Redesigned to match website's dark theme and glassmorphism style
     */
    private static function buildAdminNotificationTemplate(array $order, array $items): string
    {
        $itemsHtml = '';
        foreach ($items as $item) {
            $variantName = $item['variant_name'] ?: 'N/A';
            $itemsHtml .= "<tr style='border-bottom: 1px solid rgba(120, 113, 108, 0.3);'>
                <td style='padding: 12px; color: #ffffff;'>{$item['product_name']}</td>
                <td style='padding: 12px; color: #d6d3d1;'>{$variantName}</td>
                <td style='padding: 12px; color: #ffffff; text-align: center;'>{$item['quantity']}</td>
                <td style='padding: 12px; color: #ffffff; text-align: right;'>{$order['currency']} " . number_format($item['unit_price'], 2) . "</td>
            </tr>";
        }
        
        $paymentMethodDisplay = ucwords(str_replace('_', ' ', $order['payment_method']));
        $statusBadgeColor = $order['status'] === 'completed' ? '#10b981' : ($order['status'] === 'paid' ? '#3b82f6' : '#eab308');
        $paymentStatusBadgeColor = $order['payment_status'] === 'completed' ? '#10b981' : ($order['payment_status'] === 'pending' ? '#eab308' : '#DC143C');
        
        $playerInfo = '';
        if (!empty($order['player_name'])) {
            $playerInfo .= "<div class='info-row'><strong>Player Name:</strong> {$order['player_name']}</div>";
            if (!empty($order['player_date_of_birth'])) {
                $dob = date('F j, Y', strtotime($order['player_date_of_birth']));
                $playerInfo .= "<div class='info-row'><strong>Player DOB:</strong> {$dob}</div>";
            }
            if (!empty($order['trial_coach_name'])) {
                $playerInfo .= "<div class='info-row'><strong>Trial Coach:</strong> {$order['trial_coach_name']}</div>";
            }
        }
        
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <style>
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                    background-color: #111827; 
                    color: #ffffff;
                }
                .email-wrapper { 
                    background: linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(0, 51, 102, 0.1) 50%, rgba(17, 24, 39, 0.95) 100%);
                    padding: 40px 20px;
                    min-height: 100vh;
                }
                .email-container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: rgba(41, 37, 36, 0.8);
                    border: 1px solid rgba(120, 113, 108, 0.3);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                }
                .header { 
                    background: linear-gradient(135deg, rgba(220, 20, 60, 0.9) 0%, rgba(0, 51, 102, 0.9) 100%);
                    padding: 32px 24px;
                    text-align: center;
                }
                .header h1 { 
                    margin: 0 0 8px 0; 
                    font-size: 28px; 
                    font-weight: 700; 
                    color: #ffffff;
                }
                .header p { 
                    margin: 0; 
                    font-size: 16px; 
                    color: rgba(255, 255, 255, 0.9);
                }
                .content { 
                    padding: 24px; 
                    background: transparent;
                }
                .card { 
                    background: rgba(68, 64, 60, 0.4);
                    border: 1px solid rgba(120, 113, 108, 0.3);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 16px;
                }
                .card h2 { 
                    margin: 0 0 16px 0; 
                    font-size: 20px; 
                    font-weight: 600; 
                    color: #ffffff;
                    border-bottom: 1px solid rgba(120, 113, 108, 0.3);
                    padding-bottom: 12px;
                }
                .info-row { 
                    margin: 12px 0; 
                    color: #d6d3d1;
                }
                .info-row strong { 
                    color: #ffffff; 
                    font-weight: 600;
                }
                .status-badge {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 600;
                    background-color: {$statusBadgeColor}20;
                    color: {$statusBadgeColor};
                    border: 1px solid {$statusBadgeColor}30;
                }
                .payment-status-badge {
                    display: inline-block;
                    padding: 6px 12px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 600;
                    background-color: {$paymentStatusBadgeColor}20;
                    color: {$paymentStatusBadgeColor};
                    border: 1px solid {$paymentStatusBadgeColor}30;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 16px 0;
                }
                th { 
                    background: rgba(68, 64, 60, 0.6);
                    padding: 12px;
                    text-align: left;
                    font-weight: 600;
                    color: #ffffff;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    border-bottom: 2px solid rgba(120, 113, 108, 0.3);
                }
                .btn {
                    display: inline-block;
                    background: linear-gradient(135deg, #DC143C 0%, #b01030 100%);
                    color: #ffffff;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 16px;
                    transition: all 0.3s ease;
                }
                .btn:hover {
                    background: linear-gradient(135deg, #b01030 0%, #DC143C 100%);
                }
                .footer { 
                    text-align: center; 
                    padding: 24px; 
                    background: rgba(41, 37, 36, 0.6);
                    border-top: 1px solid rgba(120, 113, 108, 0.3);
                }
                .footer p { 
                    margin: 8px 0; 
                    color: #a8a29e; 
                    font-size: 13px;
                }
            </style>
        </head>
        <body>
            <div class='email-wrapper'>
                <div class='email-container'>
                    <div class='header'>
                        <h1>New Order Received</h1>
                        <p>Order #{$order['order_number']}</p>
                    </div>
                    <div class='content'>
                        <div class='card'>
                            <h2>Customer Information</h2>
                            <div class='info-row'><strong>Name:</strong> {$order['guest_name']}</div>
                            <div class='info-row'><strong>Email:</strong> <a href='mailto:{$order['guest_email']}' style='color: #DC143C; text-decoration: none;'>{$order['guest_email']}</a></div>
                            <div class='info-row'><strong>Phone:</strong> {$order['guest_phone']}</div>
                            {$playerInfo}
                        </div>
                        
                        <div class='card'>
                            <h2>Order Items</h2>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Variant</th>
                                        <th style='text-align: center;'>Qty</th>
                                        <th style='text-align: right;'>Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {$itemsHtml}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class='card'>
                            <h2>Order Summary</h2>
                            <div class='info-row'><strong>Total Amount:</strong> <span style='color: #DC143C; font-size: 20px; font-weight: 700;'>{$order['currency']} " . number_format($order['total_amount'], 2) . "</span></div>
                            <div class='info-row'><strong>Payment Method:</strong> {$paymentMethodDisplay}</div>
                            <div class='info-row'><strong>Order Status:</strong> <span class='status-badge'>{$order['status']}</span></div>
                            <div class='info-row'><strong>Payment Status:</strong> <span class='payment-status-badge'>{$order['payment_status']}</span></div>
                            <a href='https://secrets.gatvia.com/admin/orders/?orderId={$order['id']}' class='btn'>View Order in Admin Panel</a>
                        </div>
                    </div>
                    <div class='footer'>
                        <p>Gulf United FC - Academy Store</p>
                        <p style='color: #78716c; font-size: 11px;'>This is an automated notification email.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * Send email using configured SMTP settings
     */
    private static function sendEmail(string $to, string $subject, string $message, string $toName = ''): bool
    {
        // Get email settings
        $smtpHost = Setting::get('email_host', '');
        $smtpPort = Setting::get('email_port', '587');
        $smtpUsername = Setting::get('email_username', '');
        $encryptedPassword = Setting::get('email_password', '');
        // From address and name are fully database-driven
        $smtpFromEmail = Setting::get('email_from', '');
        $smtpFromName = Setting::get('email_from_name', '');
        
        // Decrypt password
        $smtpPassword = '';
        if ($encryptedPassword) {
            if (EncryptionService::isEncrypted($encryptedPassword)) {
                try {
                    $smtpPassword = EncryptionService::decrypt($encryptedPassword);
                } catch (\Exception $e) {
                    $smtpPassword = base64_decode($encryptedPassword) ?: '';
                }
            } else {
                $smtpPassword = base64_decode($encryptedPassword) ?: '';
            }
        }
        
        // If SMTP not configured, use PHP mail()
        if (empty($smtpHost) || empty($smtpUsername) || empty($smtpPassword)) {
            $headers = [
                "MIME-Version: 1.0",
                "Content-type: text/html; charset=UTF-8",
                "From: {$smtpFromName} <{$smtpFromEmail}>",
                "Reply-To: {$smtpFromEmail}",
                "X-Mailer: PHP/" . phpversion()
            ];
            
            return @mail($to, $subject, $message, implode("\r\n", $headers));
        }
        
        // Use SMTP (basic implementation - consider PHPMailer for production)
        // For now, fallback to mail()
        $headers = [
            "MIME-Version: 1.0",
            "Content-type: text/html; charset=UTF-8",
            "From: {$smtpFromName} <{$smtpFromEmail}>",
            "Reply-To: {$smtpFromEmail}",
            "X-Mailer: PHP/" . phpversion()
        ];
        
        return @mail($to, $subject, $message, implode("\r\n", $headers));
    }
}

