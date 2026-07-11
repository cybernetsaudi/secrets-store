<?php
/**
 * Create Admin User Script
 * Usage: php create_admin.php <username> <email> <password>
 * 
 * This script creates the first admin user for the system.
 * Run this after initial database setup.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use App\Models\AdminUser;
use App\Core\Database;
use Dotenv\Dotenv;

// Load environment variables
if (file_exists(__DIR__ . '/../.env')) {
    $dotenv = Dotenv::createImmutable(__DIR__ . '/..');
    $dotenv->load();
}

// Initialize database
try {
    Database::getInstance();
} catch (Exception $e) {
    die("Database connection failed: " . $e->getMessage() . "\n");
}

// Get command line arguments
if ($argc < 4) {
    die("Usage: php create_admin.php <username> <email> <password>\n");
}

$username = $argv[1];
$email = $argv[2];
$password = $argv[3];

// Validate inputs
if (empty($username) || empty($email) || empty($password)) {
    die("Error: Username, email, and password are required.\n");
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die("Error: Invalid email address.\n");
}

if (strlen($password) < 8) {
    die("Error: Password must be at least 8 characters long.\n");
}

// Check if user already exists
$existing = AdminUser::findByUsername($username);
if ($existing) {
    die("Error: User with username '{$username}' already exists.\n");
}

// Create admin user
try {
    $user = AdminUser::create([
        'username' => $username,
        'email' => $email,
        'password' => $password,
        'role' => 'admin',
        'is_active' => true,
    ]);
    
    echo "✅ Admin user created successfully!\n";
    echo "Username: {$username}\n";
    echo "Email: {$email}\n";
    echo "Role: admin\n";
    echo "\n";
    echo "⚠️  IMPORTANT: Please change the default password after first login!\n";
} catch (Exception $e) {
    die("Error creating admin user: " . $e->getMessage() . "\n");
}







