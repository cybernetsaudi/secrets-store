<?php

namespace App\Controllers;

use App\Models\Setting;
use App\Models\Order;
use App\Models\PaymentGateway;
use App\Services\EmailService;

/**
 * Email Controller
 * Handles sending emails to staff and customers
 */
class EmailController
{
    /**
     * Send email to staff about bank transfer order
     * POST /api/email/staff
     */
    public function sendToStaff(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $required = ['order_number', 'customer_name', 'customer_email', 'message'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                http_response_code(400);
                return ['error' => "Missing required field: {$field}"];
            }
        }
        
        // Get order details
        $order = Order::findByOrderNumber($data['order_number']);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }
        
        // Get staff email from bank transfer gateway or global settings
        $bankTransferGateway = PaymentGateway::findByType('bank_transfer');
        $staffEmail = !empty($bankTransferGateway['staff_email'])
            ? $bankTransferGateway['staff_email']
            : Setting::get('staff_email', '');
        if (empty($staffEmail)) {
            http_response_code(400);
            return ['error' => 'Staff notification email is not configured'];
        }
        
        $paymentLabel = ucwords(str_replace('_', ' ', $order['payment_method'] ?? 'order'));
        $subject = "Customer message – Order {$order['order_number']} ({$paymentLabel})";
        $message = $this->buildStaffEmailTemplate($order, $data);
        
        // Send email via shared service (SMTP settings from admin)
        try {
            $sent = EmailService::sendStaffContactEmail(
                $staffEmail,
                $subject,
                $message,
                $data['customer_email'],
                $data['customer_name']
            );
            
            if ($sent) {
                return ['success' => true, 'message' => 'Email sent successfully'];
            } else {
                http_response_code(500);
                return ['error' => 'Failed to send email'];
            }
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Email error: ' . $e->getMessage()];
        }
    }
    
    /**
     * Build staff email template
     */
    private function buildStaffEmailTemplate($order, $data): string
    {
        $orderItems = Order::getItems($order['id']);
        $itemsHtml = '';
        foreach ($orderItems as $item) {
            $variantName = $item['variant_name'] ? $item['variant_name'] : 'N/A';
            $itemsHtml .= "<tr>
                <td>{$item['product_name']}</td>
                <td>{$variantName}</td>
                <td>{$item['quantity']}</td>
                <td>{$order['currency']} " . number_format($item['unit_price'], 2) . "</td>
            </tr>";
        }
        
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #111827; color: white; padding: 20px; text-align: center; }
                .content { background: #f9fafb; padding: 20px; }
                .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
                .customer-message { background: #fff3cd; padding: 15px; margin: 15px 0; border-left: 4px solid #ffc107; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f3f4f6; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>Customer message</h1>
                    <p>Order #{$order['order_number']}</p>
                </div>
                <div class='content'>
                    <div class='order-details'>
                        <h2>Order Information</h2>
                        <p><strong>Order Number:</strong> {$order['order_number']}</p>
                        <p><strong>Customer Name:</strong> {$order['guest_name']}</p>
                        <p><strong>Customer Email:</strong> {$order['guest_email']}</p>
                        <p><strong>Customer Phone:</strong> {$order['guest_phone']}</p>
                        <p><strong>Shipping Address:</strong> " . htmlspecialchars(Order::formatShippingAddress($order)) . "</p>
                        <p><strong>Total Amount:</strong> {$order['currency']} " . number_format($order['total_amount'], 2) . "</p>
                        <p><strong>Status:</strong> {$order['status']}</p>
                    </div>
                    
                    <div class='order-details'>
                        <h2>Order Items</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Variant</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {$itemsHtml}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class='customer-message'>
                        <h3>Message from Customer:</h3>
                        <p>" . nl2br(htmlspecialchars($data['message'])) . "</p>
                        <p><strong>From:</strong> {$data['customer_name']} ({$data['customer_email']})</p>
                    </div>
                    
                    <div class='order-details'>
                        <p><strong>Payment method:</strong> " . htmlspecialchars(ucwords(str_replace('_', ' ', $order['payment_method'] ?? ''))) . "</p>
                        <p><a href='https://secrets.gatvia.com/admin/orders/?orderId={$order['id']}' style='background: #111827; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;'>View Order in Admin Panel</a></p>
                    </div>
                </div>
                <div class='footer'>
                    <p>GATVIA Secrets</p>
                    <p>This is an automated email. Please do not reply directly.</p>
                </div>
            </div>
        </body>
        </html>";
    }
}

