<?php
// Direct update script - minimal dependencies
$dbConfig = [
    'host' => $_ENV['DB_HOST'] ?? 'localhost',
    'dbname' => $_ENV['DB_NAME'] ?? '',
    'user' => $_ENV['DB_USER'] ?? '',
    'pass' => $_ENV['DB_PASS'] ?? '',
];

// Load .env if exists
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $dbConfig[strtolower(trim($name))] = trim($value);
    }
}

try {
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};dbname={$dbConfig['dbname']};charset=utf8mb4",
        $dbConfig['user'],
        $dbConfig['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    $stmt = $pdo->prepare("UPDATE payment_gateways SET api_secret = ?, public_key = ?, merchant_id = ?, is_test_mode = 0, is_active = 1, updated_at = NOW() WHERE gateway_type = 'tabby'");
    $stmt->execute([
        'sk_01956b47-9761-fd31-cb12-6dfbb14b2e93',
        'pk_01956b47-9761-fd31-cb12-6dfb5b2b4087',
        'GUFC'
    ]);
    
    $verify = $pdo->query("SELECT LEFT(api_secret, 30) as api_secret, LEFT(public_key, 30) as public_key, merchant_id, is_test_mode, is_active FROM payment_gateways WHERE gateway_type = 'tabby'")->fetch(PDO::FETCH_ASSOC);
    
    echo "SUCCESS\n";
    echo "API Secret: {$verify['api_secret']}...\n";
    echo "Public Key: {$verify['public_key']}...\n";
    echo "Merchant: {$verify['merchant_id']}\n";
    echo "is_test_mode: {$verify['is_test_mode']}\n";
    echo "is_active: {$verify['is_active']}\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

