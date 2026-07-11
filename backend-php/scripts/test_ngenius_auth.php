<?php
/**
 * Diagnose N-Genius token authentication (no secrets printed).
 * Usage: php scripts/test_ngenius_auth.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Models\PaymentGateway;

if (file_exists(__DIR__ . '/../.env')) {
    Dotenv::createImmutable(__DIR__ . '/..')->load();
}

$row = PaymentGateway::findAnyByType('ngenius');
if (!$row) {
    echo "No ngenius gateway row found\n";
    exit(1);
}

$key = trim((string)($row['api_key'] ?? ''));
$test = !empty($row['is_test_mode']);
$outlet = trim((string)($row['merchant_id'] ?? ''));
$base = $test
    ? 'https://api-gateway.sandbox.ngenius-payments.com'
    : 'https://api-gateway.ngenius-payments.com';

function tryToken(string $base, string $key, string $realm): array
{
    $body = json_encode(['grant_type' => 'client_credentials', 'realm' => $realm]);
    $ch = curl_init($base . '/identity/auth/access-token');
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            'Authorization: Basic ' . $key,
            'Content-Type: application/vnd.ni-identity.v1+json',
            'Accept: application/vnd.ni-identity.v1+json',
        ],
        CURLOPT_TIMEOUT => 20,
    ];
    if (defined('CURL_IPRESOLVE_V4')) {
        $opts[CURLOPT_IPRESOLVE] = CURL_IPRESOLVE_V4;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    $json = json_decode((string)$raw, true);
    $msg = '';
    if (is_array($json)) {
        $msg = (string)($json['message'] ?? $json['error_description'] ?? $json['error'] ?? '');
    }
    return [
        'http' => $code,
        'msg' => $msg,
        'has_token' => is_array($json) && !empty($json['access_token']),
        'curl_error' => $err,
    ];
}

echo 'gateway_active=' . (!empty($row['is_active']) ? 'yes' : 'no') . "\n";
echo 'is_test_mode=' . ($test ? 'yes' : 'no') . "\n";
echo 'api_key_len=' . strlen($key) . "\n";
echo 'outlet_set=' . ($outlet !== '' ? 'yes' : 'no') . "\n";
echo 'base_url=' . $base . "\n";

foreach (['networkinternational', 'ni'] as $realm) {
    $r = tryToken($base, $key, $realm);
    echo "realm={$realm} http={$r['http']} token=" . ($r['has_token'] ? 'yes' : 'no');
    if ($r['msg'] !== '') {
        echo ' msg=' . substr($r['msg'], 0, 120);
    }
    if ($r['curl_error'] !== '') {
        echo ' curl=' . $r['curl_error'];
    }
    echo "\n";
}
