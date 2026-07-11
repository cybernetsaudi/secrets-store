<?php

namespace App\Services;

use App\Core\Database;
use App\Models\Order;
use App\Models\Payment;

/**
 * Verify redirect-based gateways (Network.ae, Tabby, Tamara) and sync order status.
 */
class RedirectPaymentVerifier
{
    private const REDIRECT_GATEWAYS = ['tabby', 'tamara', 'ngenius'];

    /**
     * If order is pending, check gateway API and update local status when paid/failed.
     *
     * @return array Updated order row (same shape as Order::find)
     */
    public static function verifyOrderIfPending(array $order): array
    {
        $orderId = (int)($order['id'] ?? 0);
        if ($orderId <= 0) {
            return $order;
        }

        $gatewayType = (string)($order['payment_method'] ?? '');
        if (!in_array($gatewayType, self::REDIRECT_GATEWAYS, true)) {
            return $order;
        }

        if (($order['payment_status'] ?? '') !== 'pending' || ($order['status'] ?? '') !== 'pending') {
            return $order;
        }

        $paymentStmt = Database::query(
            "SELECT * FROM payments WHERE order_id = ? AND gateway = ? ORDER BY created_at DESC LIMIT 1",
            [$orderId, $gatewayType]
        );
        $payment = $paymentStmt->fetch();
        if (!$payment || empty($payment['transaction_id'])) {
            return $order;
        }

        $transactionId = (string)$payment['transaction_id'];
        if (str_starts_with($transactionId, 'rejected-')) {
            return $order;
        }

        $gateway = PaymentGatewayFactory::getGateway($gatewayType);
        if (!$gateway) {
            return $order;
        }

        $verification = $gateway->verifyPayment($transactionId);
        $mappedStatus = $verification['status'] ?? 'pending';

        if ($mappedStatus === 'completed') {
            Order::updateStatus($orderId, 'paid', 'completed');
            Payment::updateStatus($transactionId, 'completed');
            $updatedOrder = Order::find($orderId);
            if ($updatedOrder) {
                try {
                    PlayerOnboardingService::sendOnboardingData($updatedOrder);
                } catch (\Exception $e) {
                    error_log("RedirectPaymentVerifier: onboarding failed for order {$orderId}: " . $e->getMessage());
                }
            }
            error_log("RedirectPaymentVerifier: order {$order['order_number']} marked completed via {$gatewayType}");
            return $updatedOrder ?: $order;
        }

        if ($mappedStatus === 'failed') {
            Order::updateStatus($orderId, 'pending', 'failed');
            Payment::updateStatus($transactionId, 'failed');
            if (isset($verification['gateway_response'])) {
                Database::query(
                    "UPDATE payments SET gateway_response = ? WHERE transaction_id = ?",
                    [json_encode($verification['gateway_response']), $transactionId]
                );
            }
            error_log("RedirectPaymentVerifier: order {$order['order_number']} marked failed via {$gatewayType}");
            return Order::find($orderId) ?: $order;
        }

        return $order;
    }

    /**
     * Manual/admin verification with structured result.
     */
    public static function verifyOrderById(int $orderId): array
    {
        $order = Order::find($orderId);
        if (!$order) {
            return ['success' => false, 'error' => 'Order not found'];
        }

        $gatewayType = (string)($order['payment_method'] ?? '');
        if (!in_array($gatewayType, self::REDIRECT_GATEWAYS, true)) {
            return [
                'success' => false,
                'error' => 'Order does not use a redirect payment gateway',
                'order_number' => $order['order_number'],
            ];
        }

        $payment = Payment::findByOrderAndGateway($orderId, $gatewayType);
        if (!$payment || empty($payment['transaction_id'])) {
            return [
                'success' => false,
                'error' => 'No payment record or gateway reference found for this order',
                'order_number' => $order['order_number'],
            ];
        }

        $beforeStatus = $order['payment_status'];
        $updated = self::verifyOrderIfPending($order);
        $afterStatus = $updated['payment_status'] ?? $beforeStatus;

        return [
            'success' => true,
            'order_number' => $order['order_number'],
            'transaction_id' => $payment['transaction_id'],
            'gateway' => $gatewayType,
            'gateway_status' => null,
            'mapped_status' => $afterStatus === 'completed' ? 'completed' : ($afterStatus === 'failed' ? 'failed' : 'pending'),
            'updated' => $afterStatus !== $beforeStatus,
            'message' => $afterStatus !== $beforeStatus
                ? "Order updated to payment_status={$afterStatus}"
                : 'Payment still pending at gateway (customer may not have completed checkout)',
            'order' => $updated,
        ];
    }
}
