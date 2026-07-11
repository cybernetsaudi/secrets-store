<?php
/**
 * Emergency API Restoration Script
 * Run this if API directory/files are missing
 * 
 * Usage: php ensure_api_exists.php
 * Or via web: https://secrets.gatvia.com/api/ensure_api_exists.php
 */

$apiDir = __DIR__;
$publicHtml = dirname($apiDir);
$htaccessPath = $publicHtml . '/.htaccess';

echo "🔧 API Restoration Script\n";
echo "========================\n\n";

// Check if .htaccess exists
if (!file_exists($htaccessPath)) {
    echo "❌ .htaccess missing - creating...\n";
    $htaccessContent = <<<'HTACCESS'
# Gulf United FC E-Commerce Store
# Root .htaccess configuration

RewriteEngine On
RewriteBase /

# CRITICAL: API routes MUST come first, before any other rules
# Route all /api/* requests to api/index.php
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ api/index.php [QSA,L]

# If the request is for an existing file or directory, serve it directly
# This handles _next/ static assets, CSS, JS, images, etc.
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Frontend routes - serve index.html for client-side routing
# Exclude API and existing files
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]

# Default index - prioritize index.php for landing page, then index.html for store
DirectoryIndex index.php index.html

# Special handling: if user visits root and index.php exists, serve it
RewriteCond %{REQUEST_URI} ^/$
RewriteCond %{REQUEST_FILENAME}index.php -f
RewriteRule ^$ index.php [L]

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>
HTACCESS;
    
    file_put_contents($htaccessPath, $htaccessContent);
    chmod($htaccessPath, 0644);
    echo "✅ .htaccess created\n";
} else {
    echo "✅ .htaccess exists\n";
}

// Check critical files
$criticalFiles = [
    'index.php' => 'Main API entry point',
    'vendor/autoload.php' => 'Composer autoloader',
    'routes/api.php' => 'API routes',
];

$allGood = true;
foreach ($criticalFiles as $file => $description) {
    $filePath = $apiDir . '/' . $file;
    if (!file_exists($filePath)) {
        echo "❌ Missing: $file ($description)\n";
        $allGood = false;
    } else {
        echo "✅ Found: $file\n";
    }
}

if ($allGood) {
    echo "\n✅ All critical files present!\n";
    echo "✅ API should be working\n";
} else {
    echo "\n❌ Some files are missing!\n";
    echo "Please redeploy the API backend.\n";
}

echo "\n📋 Status:\n";
echo "- API Directory: " . (is_dir($apiDir) ? "✅ EXISTS" : "❌ MISSING") . "\n";
echo "- .htaccess: " . (file_exists($htaccessPath) ? "✅ EXISTS" : "❌ MISSING") . "\n";
echo "- index.php: " . (file_exists($apiDir . '/index.php') ? "✅ EXISTS" : "❌ MISSING") . "\n";
echo "- vendor/autoload.php: " . (file_exists($apiDir . '/vendor/autoload.php') ? "✅ EXISTS" : "❌ MISSING") . "\n";


