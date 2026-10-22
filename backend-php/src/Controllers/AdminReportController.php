<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Database;

/**
 * Admin Reporting Controller
 * Provides accountant-friendly order and VAT reports.
 */
class AdminReportController
{
    /**
     * Orders & VAT report
     * GET /api/admin/reports/orders
     *
     * Query params:
     * - from: YYYY-MM-DD (inclusive)
     * - to:   YYYY-MM-DD (inclusive)
     */
    public function ordersReport(): array
    {
        Auth::requireAuth();

        $from = $_GET['from'] ?? null;
        $to = $_GET['to'] ?? null;

        // Default to last 30 days if no range provided
        if (!$from || !$to) {
            $toDate = new \DateTime('today');
            $fromDate = (clone $toDate)->modify('-30 days');
            $from = $from ?: $fromDate->format('Y-m-d');
            $to = $to ?: $toDate->format('Y-m-d');
        }

        $fromDateTime = $from . ' 00:00:00';
        $toDateTime = $to . ' 23:59:59';

        // Fetch only paid and completed orders in date range
        // payment_ref = transaction_id from payments (Stripe pi_xxx, Tabby session/payment id); one per order via subquery
        $stmt = Database::query(
            "SELECT o.*,
             (SELECT p.transaction_id FROM payments p WHERE p.order_id = o.id AND p.status = 'completed' ORDER BY p.created_at DESC LIMIT 1) AS payment_ref
             FROM orders o
             WHERE o.created_at BETWEEN ? AND ?
             AND o.payment_status = 'completed'
             AND (o.status = 'paid' OR o.status = 'completed')
             ORDER BY o.created_at DESC",
            [$fromDateTime, $toDateTime]
        );
        $orders = $stmt->fetchAll() ?: [];

        $summary = [
            'count' => 0,
            'by_currency' => [],
            'totals_pkr' => [
                'subtotal' => 0.0,
                'discount' => 0.0,
                'vat' => 0.0,
                'total' => 0.0,
            ],
        ];

        foreach ($orders as &$order) {
            $currency = $order['currency'] ?? 'PKR';
            $subtotal = (float)$order['subtotal'];
            $discount = (float)($order['discount_amount'] ?? 0);
            $vat = (float)$order['vat_amount'];
            $total = (float)$order['total_amount'];

            // Attach items for detailed view
            $itemsStmt = Database::query(
                "SELECT oi.*, p.name as product_name, pv.name as variant_name
                 FROM order_items oi
                 LEFT JOIN products p ON oi.product_id = p.id
                 LEFT JOIN product_variants pv ON oi.variant_id = pv.id
                 WHERE oi.order_id = ?",
                [$order['id']]
            );
            $order['items'] = $itemsStmt->fetchAll() ?: [];

            $summary['count']++;

            if (!isset($summary['by_currency'][$currency])) {
                $summary['by_currency'][$currency] = [
                    'subtotal' => 0.0,
                    'discount' => 0.0,
                    'vat' => 0.0,
                    'total' => 0.0,
                ];
            }

            $summary['by_currency'][$currency]['subtotal'] += $subtotal;
            $summary['by_currency'][$currency]['discount'] += $discount;
            $summary['by_currency'][$currency]['vat'] += $vat;
            $summary['by_currency'][$currency]['total'] += $total;

            // Convert to PKR using fx_rate (rate from PKR -> order currency)
            $fxRate = (float)($order['fx_rate'] ?? 1.0);
            $rate = $fxRate > 0 ? $fxRate : 1.0;
            $subtotalPkr = $currency === 'PKR' ? $subtotal : ($subtotal / $rate);
            $discountPkr = $currency === 'PKR' ? $discount : ($discount / $rate);
            $vatPkr = $currency === 'PKR' ? $vat : ($vat / $rate);
            $totalPkr = $currency === 'PKR' ? $total : ($total / $rate);

            $summary['totals_pkr']['subtotal'] += $subtotalPkr;
            $summary['totals_pkr']['discount'] += $discountPkr;
            $summary['totals_pkr']['vat'] += $vatPkr;
            $summary['totals_pkr']['total'] += $totalPkr;
        }

        return [
            'filters' => [
                'from' => $from,
                'to' => $to,
            ],
            'results' => $orders,
            'summary' => $summary,
        ];
    }
}







