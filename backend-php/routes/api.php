<?php

use App\Controllers\ProductController;
use App\Controllers\OrderController;
use App\Controllers\PaymentController;
use App\Controllers\CurrencyController;
use App\Controllers\DiscountController;
use App\Controllers\AbandonedCartController;
use App\Controllers\EmailController;
use App\Controllers\PaymentGatewayController;
use App\Controllers\AdminAuthController;
use App\Controllers\AdminProductController;
use App\Controllers\AdminDiscountController;
use App\Controllers\AdminOrderController;
use App\Controllers\AdminSettingsController;
use App\Controllers\AdminPaymentGatewayController;
use App\Controllers\AdminBankAccountController;
use App\Controllers\AdminReportController;
use App\Controllers\AdminDeployController;
use App\Controllers\ServerDiagnosticsController;
use App\Core\Auth;
use App\Models\Setting;

// Public API Routes

// Products
$router->get('/products', [ProductController::class , 'index']);
$router->get('/products/{id}', [ProductController::class , 'show']);

// Orders
$router->post('/checkout', [OrderController::class , 'checkout']);
$router->get('/orders/by-number/{orderNumber}', [OrderController::class , 'getByOrderNumber']);

// Payment
$router->post('/payment/create-intent', [PaymentController::class , 'createIntent']);
$router->post('/payment/confirm', [PaymentController::class , 'confirmPayment']);

// Public Payment Gateway Info
// List active gateways for checkout (non-sensitive)
$router->get('/payment-gateways', [PaymentGatewayController::class , 'getActiveGateways']);

// Currency
$router->get('/currency/rates', [CurrencyController::class , 'getRate']);

// Discount
$router->post('/discount/validate', [DiscountController::class , 'validate']);

// Abandoned Cart
$router->post('/abandoned-cart', [AbandonedCartController::class , 'save']);
$router->get('/abandoned-cart', [AbandonedCartController::class , 'get']);

// Webhooks
$router->post('/webhooks/stripe', [PaymentController::class , 'stripeWebhook']);
$router->post('/webhooks/tabby', [PaymentController::class , 'tabbyWebhook']);
$router->post('/webhooks/tamara', [PaymentController::class , 'tamaraWebhook']);
$router->post('/webhooks/ngenius', [PaymentController::class , 'ngeniusWebhook']);

// Email
$router->post('/email/staff', [EmailController::class , 'sendToStaff']);

// Payment Gateway Info (public - for bank details)
$router->get('/payment-gateway/bank-transfer', [PaymentGatewayController::class , 'getBankTransferDetails']);
$router->get('/payment-gateway/stripe', [PaymentGatewayController::class , 'getStripeDetails']);
$router->get('/payment-gateway/tabby', [PaymentGatewayController::class , 'getTabbyDetails']);
$router->get('/payment-gateway/tamara', [PaymentGatewayController::class , 'getTamaraDetails']);

// Logo Settings (public - for frontend to display logos)
$router->get('/settings/logo', function () {
    $controller = new AdminSettingsController();
    return $controller->getLogoSettings();
});

// Public contact settings (staff/email from database)
$router->get('/settings/contact', function () {
    return [
    'staff_email' => Setting::get('staff_email', ''),
    'email_from' => Setting::get('email_from', ''),
    'email_from_name' => Setting::get('email_from_name', ''),
    ];
});

// Admin Bank Accounts (Protected)
$router->get('/admin/payment-gateways/{gatewayId}/bank-accounts', function ($gatewayId) {
    Auth::requireAuth();
    $controller = new AdminBankAccountController();
    return $controller->index($gatewayId);
});
$router->get('/admin/bank-accounts/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminBankAccountController();
    return $controller->show($id);
});
$router->post('/admin/payment-gateways/{gatewayId}/bank-accounts', function ($gatewayId) {
    Auth::requireAuth();
    $controller = new AdminBankAccountController();
    return $controller->store($gatewayId);
});
$router->put('/admin/bank-accounts/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminBankAccountController();
    return $controller->update($id);
});
$router->delete('/admin/bank-accounts/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminBankAccountController();
    return $controller->destroy($id);
});

// Admin API Routes (Protected)

// Admin Authentication (public)
$router->post('/admin/login', [AdminAuthController::class , 'login']);

// Protected admin routes - manually apply auth middleware
// Admin Auth
$router->post('/admin/logout', function () {
    Auth::requireAuth();
    $controller = new AdminAuthController();
    return $controller->logout();
});
$router->get('/admin/me', function () {
    Auth::requireAuth();
    $controller = new AdminAuthController();
    return $controller->me();
});
$router->put('/admin/change-password', function () {
    Auth::requireAuth();
    $controller = new AdminAuthController();
    return $controller->changePassword();
});

// Admin Products
$router->get('/admin/products', function () {
    Auth::requireAuth();
    $controller = new AdminProductController();
    return $controller->index();
});
$router->get('/admin/products/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminProductController();
    return $controller->show($id);
});
$router->post('/admin/products', function () {
    Auth::requireAuth();
    $controller = new AdminProductController();
    return $controller->create();
});
// Handle POST with _method=PUT for file uploads (Router now handles method override)
$router->post('/admin/products/{id}', function ($id) {
    Auth::requireAuth();
    // Check if this is a PUT override (for file uploads)
    if (isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT') {
        $controller = new AdminProductController();
        return $controller->update($id);
    }
    // Otherwise, treat as create (shouldn't happen, but handle gracefully)
    http_response_code(405);
    return ['error' => 'Method not allowed. Use PUT or POST with _method=PUT'];
});
$router->put('/admin/products/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminProductController();
    return $controller->update($id);
});
$router->delete('/admin/products/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminProductController();
    return $controller->delete($id);
});

// Toggle product active/inactive (hide/unhide)
$router->post('/admin/products/{id}/toggle-active', function ($id) {
    Auth::requireAuth();
    $controller = new AdminProductController();
    return $controller->toggleActive($id);
});

// Admin Discounts
$router->get('/admin/discounts', function () {
    Auth::requireAuth();
    $controller = new AdminDiscountController();
    return $controller->index();
});
$router->get('/admin/discounts/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminDiscountController();
    return $controller->show($id);
});
$router->post('/admin/discounts', function () {
    Auth::requireAuth();
    $controller = new AdminDiscountController();
    return $controller->create();
});
$router->put('/admin/discounts/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminDiscountController();
    return $controller->update($id);
});
$router->delete('/admin/discounts/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminDiscountController();
    return $controller->delete($id);
});

// Admin Orders
$router->get('/admin/orders', function () {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->index();
});
$router->get('/admin/orders/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->show($id);
});
$router->put('/admin/orders/{id}/status', function ($id) {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->updateStatus($id);
});
$router->post('/admin/orders/{id}/confirm-payment', function ($id) {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->confirmPayment($id);
});
$router->post('/admin/orders/{id}/verify-tamara', function ($id) {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->verifyTamaraPayment($id);
});
$router->post('/admin/orders/{id}/verify-payment', function ($id) {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->verifyRedirectPayment($id);
});
$router->post('/admin/orders/{id}/mark-paid', function ($id) {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->markOrderPaid($id);
});
$router->delete('/admin/orders/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->delete($id);
});
$router->post('/admin/orders/delete-all', function () {
    Auth::requireAuth();
    $controller = new AdminOrderController();
    return $controller->deleteAll();
});

// Admin Deployment
$router->post('/admin/deploy/redeploy', function () {
    Auth::requireAuth();
    $controller = new AdminDeployController();
    return $controller->redeploy();
});

$router->get('/admin/deploy/status', function () {
    Auth::requireAuth();
    $controller = new AdminDeployController();
    return $controller->status();
});

$router->post('/admin/settings/github-token', function () {
    Auth::requireAuth();
    $controller = new AdminDeployController();
    return $controller->saveGithubToken();
});

// Server Diagnostics
$router->get('/admin/server/diagnostics', function () {
    Auth::requireAuth();
    $controller = new \App\Controllers\ServerDiagnosticsController();
    return $controller->diagnostics();
});

// Admin Settings
$router->get('/admin/settings', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->index();
});
$router->get('/admin/settings/email', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->getEmailSettings();
});
$router->put('/admin/settings/email', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->updateEmailSettings();
});
$router->post('/admin/settings/email/test', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->testEmail();
});

// Logo Settings
$router->get('/admin/settings/logo', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->getLogoSettings();
});
$router->post('/admin/settings/logo', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->updateLogoSettings();
});

// Admin Visual Settings
$router->get('/admin/settings/visual', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->getVisualSettings();
});
$router->put('/admin/settings/visual', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->updateVisualSettings();
});
$router->post('/admin/settings/visual/upload', function () {
    Auth::requireAuth();
    $controller = new AdminSettingsController();
    return $controller->uploadVisualImage();
});

// Public Visual Settings (for landing page and products page)
$router->get('/settings/visual', function () {
    $controller = new AdminSettingsController();
    return [
    'landing_bg_image_url' => \App\Models\Setting::get('landing_bg_image_url', ''),
    'products_bg_image_url' => \App\Models\Setting::get('products_bg_image_url', ''),
    'landing_tile_1_image' => \App\Models\Setting::get('landing_tile_1_image', ''),
    'landing_tile_2_image' => \App\Models\Setting::get('landing_tile_2_image', ''),
    'landing_tile_3_image' => \App\Models\Setting::get('landing_tile_3_image', ''),
    'landing_tile_4_image' => \App\Models\Setting::get('landing_tile_4_image', ''),
    'landing_tile_5_image' => \App\Models\Setting::get('landing_tile_5_image', ''),
    'landing_tile_6_image' => \App\Models\Setting::get('landing_tile_6_image', ''),
    // Filter settings
    'landing_bg_contrast' => \App\Models\Setting::get('landing_bg_contrast', '1'),
    'landing_bg_saturation' => \App\Models\Setting::get('landing_bg_saturation', '1'),
    'landing_bg_brightness' => \App\Models\Setting::get('landing_bg_brightness', '0.7'),
    'products_bg_contrast' => \App\Models\Setting::get('products_bg_contrast', '1'),
    'products_bg_saturation' => \App\Models\Setting::get('products_bg_saturation', '1'),
    'products_bg_brightness' => \App\Models\Setting::get('products_bg_brightness', '0.7'),
    ];
});

// Admin Payment Gateways
$router->get('/admin/payment-gateways', function () {
    Auth::requireAuth();
    $controller = new AdminPaymentGatewayController();
    return $controller->index();
});
$router->get('/admin/payment-gateways/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminPaymentGatewayController();
    return $controller->show($id);
});
$router->post('/admin/payment-gateways', function () {
    Auth::requireAuth();
    $controller = new AdminPaymentGatewayController();
    return $controller->store();
});
$router->put('/admin/payment-gateways/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminPaymentGatewayController();
    return $controller->update($id);
});
$router->delete('/admin/payment-gateways/{id}', function ($id) {
    Auth::requireAuth();
    $controller = new AdminPaymentGatewayController();
    return $controller->destroy($id);
});

// Admin Reports
$router->get('/admin/reports/orders', function () {
    Auth::requireAuth();
    $controller = new AdminReportController();
    return $controller->ordersReport();
});

// Debug routes (remove in production)
require_once __DIR__ . '/test-debug.php';