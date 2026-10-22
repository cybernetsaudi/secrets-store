<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\Order;
use App\Models\Payment;
use App\Core\Database;
use App\Services\PaymentGatewayFactory;

/**
 * Admin Order Management Controller
 * Handles order viewing, status updates, and payment confirmations
 */
class AdminOrderController
{
    /**
     * List all orders with pagination and filters
     * GET /api/admin/orders
     */
    public function index(): array
    {
        Auth::requireAuth();
        
        $page = intval($_GET['page'] ?? 1);
        $limit = intval($_GET['limit'] ?? 20);
        $offset = ($page - 1) * $limit;
        
        // Build WHERE clause based on filters
        $whereConditions = [];
        $params = [];
        
        if (!empty($_GET['status'])) {
            $whereConditions[] = "o.status = ?";
            $params[] = $_GET['status'];
        }
        
        if (!empty($_GET['payment_status'])) {
            $whereConditions[] = "o.payment_status = ?";
            $params[] = $_GET['payment_status'];
        }
        
        if (!empty($_GET['payment_method'])) {
            $whereConditions[] = "o.payment_method = ?";
            $params[] = $_GET['payment_method'];
        }
        
        if (!empty($_GET['search'])) {
            $whereConditions[] = "(o.order_number LIKE ? OR o.guest_name LIKE ? OR o.guest_email LIKE ? OR o.guest_phone LIKE ?)";
            $searchTerm = '%' . $_GET['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        if (!empty($_GET['date_from'])) {
            $whereConditions[] = "DATE(o.created_at) >= ?";
            $params[] = $_GET['date_from'];
        }
        
        if (!empty($_GET['date_to'])) {
            $whereConditions[] = "DATE(o.created_at) <= ?";
            $params[] = $_GET['date_to'];
        }
        
        $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM orders o {$whereClause}";
        $countStmt = Database::query($countQuery, $params);
        $total = $countStmt->fetch()['total'];
        
        // Get orders with pagination
        $query = "SELECT o.* FROM orders o {$whereClause} ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = Database::query($query, $params);
        $orders = $stmt->fetchAll() ?: [];
        
        // Enhance orders with payment and rejection info
        foreach ($orders as &$order) {
            if (in_array($order['payment_method'] ?? '', ['tabby', 'tamara', 'ngenius', 'safepay'], true)
                && ($order['payment_status'] ?? '') === 'pending'
                && ($order['status'] ?? '') === 'pending') {
                $order = \App\Services\RedirectPaymentVerifier::verifyOrderIfPending($order);
            }

            // Get payment record to detect Tamara (for Verify/Mark as paid buttons) and Tabby rejection
            $paymentStmt = Database::query(
                "SELECT gateway FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
                [$order['id']]
            );
            $paymentRow = $paymentStmt->fetch();
            $order['has_tamara_payment'] = $paymentRow && ($paymentRow['gateway'] ?? '') === 'tamara';

            // Get payment info for Tabby orders (full payment row for rejection parsing)
            if ($order['payment_method'] === 'tabby') {
                $paymentStmtFull = Database::query(
                    "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
                    [$order['id']]
                );
                $payment = $paymentStmtFull->fetch();
                
                if ($payment && $payment['gateway_response']) {
                    $gatewayResponse = json_decode($payment['gateway_response'], true);
                    if ($gatewayResponse) {
                        // Extract rejection code and reason from various possible locations
                        $rejectionCode = $gatewayResponse['rejection_reason_code'] ?? 
                                       $gatewayResponse['configuration']['products']['installments']['rejection_reason_code'] ?? 
                                       $gatewayResponse['rejection_code'] ?? 
                                       ($gatewayResponse['configuration']['products']['installments'][0]['rejection_reason_code'] ?? null) ??
                                       null;
                        $rejectionReason = $gatewayResponse['rejection_reason'] ?? 
                                         $gatewayResponse['configuration']['products']['installments']['rejection_reason'] ?? 
                                         ($gatewayResponse['configuration']['products']['installments'][0]['rejection_reason'] ?? null) ??
                                         $gatewayResponse['error'] ?? 
                                         $gatewayResponse['message'] ?? 
                                         null;
                        
                        // Check nested structures
                        if (!$rejectionCode && isset($gatewayResponse['configuration'])) {
                            $config = $gatewayResponse['configuration'];
                            if (isset($config['products']['installments']['rejection_reason_code'])) {
                                $rejectionCode = $config['products']['installments']['rejection_reason_code'];
                            }
                            if (isset($config['products']['installments']['rejection_reason'])) {
                                $rejectionReason = $config['products']['installments']['rejection_reason'];
                            }
                        }
                        
                        // If no rejection info found, mark as unknown
                        if ($rejectionCode || $rejectionReason) {
                            $order['tabby_rejection'] = [
                                'code' => $rejectionCode ?: 'unknown',
                                'reason' => $rejectionReason ?: 'User didn\'t complete order @ Tabby',
                            ];
                        } else {
                            $order['tabby_rejection'] = [
                                'code' => 'unknown',
                                'reason' => 'User didn\'t complete order @ Tabby',
                            ];
                        }
                    } else {
                        $order['tabby_rejection'] = [
                            'code' => 'unknown',
                            'reason' => 'User didn\'t complete order @ Tabby',
                        ];
                    }
                } else {
                    $order['tabby_rejection'] = [
                        'code' => 'unknown',
                        'reason' => 'User didn\'t complete order @ Tabby',
                    ];
                }
            }
        }
        
        return [
            'results' => $orders,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ];
    }
    
    /**
     * Get single order details
     * GET /api/admin/orders/{id}
     */
    public function show(string $id): array
    {
        Auth::requireAuth();
        
        $order = Order::find((int)$id);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }

        $order = \App\Services\RedirectPaymentVerifier::verifyOrderIfPending($order);
        
        // Load order items
        $order['items'] = Order::getItems($order['id']);
        
        // Load payment info
        $paymentStmt = Database::query(
            "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
            [$order['id']]
        );
        $payment = $paymentStmt->fetch();
        $order['payment'] = $payment ?: null;
        
        // Extract Tabby rejection info if present
        if ($payment && $payment['gateway'] === 'tabby' && $payment['gateway_response']) {
            $gatewayResponse = json_decode($payment['gateway_response'], true);
            if ($gatewayResponse) {
                // Extract rejection code and reason from various possible locations
                $rejectionCode = $gatewayResponse['rejection_reason_code'] ?? 
                               $gatewayResponse['configuration']['products']['installments']['rejection_reason_code'] ?? 
                               $gatewayResponse['rejection_code'] ?? 
                               null;
                $rejectionReason = $gatewayResponse['rejection_reason'] ?? 
                                 $gatewayResponse['configuration']['products']['installments']['rejection_reason'] ?? 
                                 $gatewayResponse['error'] ?? 
                                 $gatewayResponse['message'] ?? 
                                 null;
                
                // Check nested structures
                if (!$rejectionCode && isset($gatewayResponse['configuration'])) {
                    $config = $gatewayResponse['configuration'];
                    if (isset($config['products']['installments']['rejection_reason_code'])) {
                        $rejectionCode = $config['products']['installments']['rejection_reason_code'];
                    }
                    if (isset($config['products']['installments']['rejection_reason'])) {
                        $rejectionReason = $config['products']['installments']['rejection_reason'];
                    }
                }
                
                if ($rejectionCode || $rejectionReason) {
                    $order['tabby_rejection'] = [
                        'code' => $rejectionCode ?: 'unknown',
                        'reason' => $rejectionReason ?: 'User didn\'t complete order @ Tabby',
                    ];
                }
            }
        }
        
        // Load discount code if present
        if ($order['discount_code_id']) {
            $discountStmt = Database::query(
                "SELECT * FROM discount_codes WHERE id = ?",
                [$order['discount_code_id']]
            );
            $discount = $discountStmt->fetch();
            $order['discount_code'] = $discount ?: null;
        }
        
        return $order;
    }
    
    /**
     * Update order status
     * PUT /api/admin/orders/{id}/status
     */
    public function updateStatus(string $id): array
    {
        Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);
        $status = $data['status'] ?? null;
        $paymentStatus = $data['payment_status'] ?? null;
        
        if (!$status) {
            http_response_code(400);
            return ['error' => 'Status is required'];
        }
        
        $order = Order::find((int)$id);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }
        
        try {
            if ($paymentStatus) {
                Order::updateStatus((int)$id, $status, $paymentStatus);
            } else {
                Order::updateStatus((int)$id, $status);
            }
            
            $updated = Order::find((int)$id);
            return $updated;
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to update order status: ' . $e->getMessage()];
        }
    }
    
    /**
     * Confirm bank transfer payment
     * POST /api/admin/orders/{id}/confirm-payment
     */
    public function confirmPayment(string $id): array
    {
        Auth::requireAuth();
        
        $order = Order::find((int)$id);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }
        
        if ($order['payment_method'] !== 'bank_transfer') {
            http_response_code(400);
            return ['error' => 'This endpoint is only for bank transfer payments'];
        }
        
        if ($order['payment_status'] !== 'pending') {
            http_response_code(400);
            return ['error' => 'Order payment status is not pending'];
        }
        
        try {
            Order::updateStatus((int)$id, 'paid', 'completed');
            
            // Send order confirmation email
            $updatedOrder = Order::find((int)$id);
            if ($updatedOrder) {
                try {
                    \App\Services\EmailService::sendOrderConfirmation($updatedOrder);
                } catch (\Exception $e) {
                    error_log('Failed to send order confirmation email: ' . $e->getMessage());
                }
                
                // Trigger player onboarding
                \App\Services\PlayerOnboardingService::sendOnboardingData($updatedOrder);
            }
            
            return [
                'success' => true,
                'message' => 'Payment confirmed successfully',
                'order' => $updatedOrder,
            ];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => 'Failed to confirm payment: ' . $e->getMessage()];
        }
    }
    
    /**
     * Verify Tamara payment status with Tamara API and optionally update order
     * POST /api/admin/orders/{id}/verify-tamara
     */
    public function verifyTamaraPayment(string $id): array
    {
        Auth::requireAuth();
        
        $order = Order::find((int)$id);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }
        
        $payment = Payment::findByOrderAndGateway((int)$id, 'tamara');
        if (!$payment || empty($payment['transaction_id'])) {
            return [
                'success' => false,
                'error' => 'No Tamara payment record or transaction_id found',
                'order_number' => $order['order_number'],
            ];
        }
        
        $gateway = PaymentGatewayFactory::getGateway('tamara');
        if (!$gateway) {
            return ['success' => false, 'error' => 'Tamara gateway not configured'];
        }
        
        $verification = $gateway->verifyPayment($payment['transaction_id']);
        $tamaraStatus = $verification['gateway_response']['status'] ?? null;
        $mappedStatus = $verification['status'] ?? 'pending';
        
        $result = [
            'success' => true,
            'order_number' => $order['order_number'],
            'transaction_id' => $payment['transaction_id'],
            'tamara_status' => $tamaraStatus,
            'mapped_status' => $mappedStatus,
            'message' => $verification['error'] ?? null,
        ];
        
        if ($mappedStatus === 'completed') {
            Order::updateStatus((int)$id, 'paid', 'completed');
            Payment::updateStatus($payment['transaction_id'], 'completed');
            $updatedOrder = Order::find((int)$id);
            if ($updatedOrder) {
                try {
                    \App\Services\PlayerOnboardingService::sendOnboardingData($updatedOrder);
                } catch (\Exception $e) {
                    error_log('PlayerOnboardingService: ' . $e->getMessage());
                }
            }
            $result['updated'] = true;
            $result['message'] = 'Order marked as paid from Tamara status: ' . $tamaraStatus;
        } elseif ($mappedStatus === 'failed') {
            Order::updateStatus((int)$id, 'pending', 'failed');
            Payment::updateStatus($payment['transaction_id'], 'failed');
            $result['updated'] = true;
            $result['message'] = 'Order marked as failed from Tamara status: ' . $tamaraStatus;
        } else {
            $result['updated'] = false;
            $result['message'] = 'Tamara status is "' . $tamaraStatus . '" – no change applied. Use "Mark as paid" if you received payment.';
        }
        
        return $result;
    }
    
    /**
     * Verify redirect gateway payment (Network.ae / Tabby / Tamara) with provider API
     * POST /api/admin/orders/{id}/verify-payment
     */
    public function verifyRedirectPayment(string $id): array
    {
        Auth::requireAuth();
        return \App\Services\RedirectPaymentVerifier::verifyOrderById((int)$id);
    }

    /**
     * Manually mark order as paid (admin override, e.g. when payment received but status not synced)
     * POST /api/admin/orders/{id}/mark-paid
     */
    public function markOrderPaid(string $id): array
    {
        Auth::requireAuth();
        
        $order = Order::find((int)$id);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }
        
        if ($order['status'] === 'paid' && $order['payment_status'] === 'completed') {
            return ['success' => true, 'message' => 'Order is already marked as paid', 'order' => $order];
        }
        
        Order::updateStatus((int)$id, 'paid', 'completed');
        
        $payment = Payment::findByOrderAndGateway((int)$id, $order['payment_method']);
        if ($payment && !empty($payment['transaction_id'])) {
            Payment::updateStatus($payment['transaction_id'], 'completed');
        }
        
        $updatedOrder = Order::find((int)$id);
        if ($updatedOrder) {
            try {
                \App\Services\EmailService::sendOrderConfirmation($updatedOrder);
            } catch (\Exception $e) {
                error_log('sendOrderConfirmation: ' . $e->getMessage());
            }
            try {
                \App\Services\PlayerOnboardingService::sendOnboardingData($updatedOrder);
            } catch (\Exception $e) {
                error_log('PlayerOnboardingService: ' . $e->getMessage());
            }
        }
        
        return [
            'success' => true,
            'message' => 'Order marked as paid',
            'order' => $updatedOrder,
        ];
    }
    
    /**
     * Delete a single order
     * DELETE /api/admin/orders/{id}
     * Only allows deletion if order status is 'pending' and payment_status is 'pending' or 'failed'
     */
    public function delete(int $id): array
    {
        Auth::requireAuth();
        
        $order = Order::find($id);
        if (!$order) {
            http_response_code(404);
            return ['error' => 'Order not found'];
        }
        
        // Only allow deletion of orders that are pending in status and pending/failed in payment_status
        // This allows deletion of failed Tabby payments and other failed payment attempts
        $isPendingStatus = $order['status'] === 'pending';
        $isPendingOrFailedPayment = in_array($order['payment_status'], ['pending', 'failed']);
        
        if (!$isPendingStatus || !$isPendingOrFailedPayment) {
            http_response_code(400);
            return [
                'error' => 'Only orders with status "pending" and payment_status "pending" or "failed" can be deleted'
            ];
        }
        
        try {
            Order::delete($id);
            
            return [
                'success' => true,
                'message' => 'Order deleted successfully'
            ];
        } catch (\Exception $e) {
            http_response_code(500);
            return [
                'error' => 'Failed to delete order: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Delete all orders (for cleanup before handover)
     * POST /api/admin/orders/delete-all
     * Requires confirmation phrase in request body
     */
    public function deleteAll(): array
    {
        Auth::requireAuth();
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Require confirmation phrase
        if (empty($data['confirmation']) || $data['confirmation'] !== 'DELETE ALL ORDERS') {
            http_response_code(400);
            return ['error' => 'Confirmation required. Send confirmation: "DELETE ALL ORDERS"'];
        }
        
        try {
            // Start transaction
            \App\Core\Database::getInstance()->beginTransaction();
            
            $deletedCounts = [];
            
            // 1. Delete payments (if payments table exists)
            try {
                $paymentCount = \App\Core\Database::query("SELECT COUNT(*) as count FROM payments")->fetch()['count'] ?? 0;
                if ($paymentCount > 0) {
                    \App\Core\Database::query("DELETE FROM payments");
                    $deletedCounts['payments'] = $paymentCount;
                }
            } catch (\Exception $e) {
                // Payments table might not exist, that's okay
            }
            
            // 2. Delete order items
            $itemsCount = \App\Core\Database::query("SELECT COUNT(*) as count FROM order_items")->fetch()['count'] ?? 0;
            if ($itemsCount > 0) {
                \App\Core\Database::query("DELETE FROM order_items");
                $deletedCounts['order_items'] = $itemsCount;
            }
            
            // 3. Delete orders
            $orderCount = \App\Core\Database::query("SELECT COUNT(*) as count FROM orders")->fetch()['count'] ?? 0;
            if ($itemsCount > 0) {
                \App\Core\Database::query("DELETE FROM orders");
                $deletedCounts['orders'] = $orderCount;
            }
            
            // 4. Delete abandoned carts (optional - test data)
            try {
                $abandonedCount = \App\Core\Database::query("SELECT COUNT(*) as count FROM abandoned_carts")->fetch()['count'] ?? 0;
                if ($abandonedCount > 0) {
                    \App\Core\Database::query("DELETE FROM abandoned_carts");
                    $deletedCounts['abandoned_carts'] = $abandonedCount;
                }
            } catch (\Exception $e) {
                // Abandoned carts table might not exist, that's okay
            }
            
            // Commit transaction
            \App\Core\Database::getInstance()->commit();
            
            return [
                'success' => true,
                'message' => 'All orders deleted successfully',
                'deleted' => $deletedCounts,
            ];
        } catch (\Exception $e) {
            // Rollback on error
            \App\Core\Database::getInstance()->rollBack();
            http_response_code(500);
            return [
                'error' => 'Failed to delete orders: ' . $e->getMessage()
            ];
        }
    }
}
