<?php
/**
 * File Upload Handler
 * Serves uploaded files (logos, product images)
 */

// Security: Only serve files from uploads directory
$requestUri = $_SERVER['REQUEST_URI'];
// Base path: from api/uploads/index.php -> api/uploads/ -> api/uploads/ (uploads is in the same directory as this file)
// Actually, uploads directory is at: api/uploads/ (same level as this index.php)
// So we need: api/uploads/logos/ and api/uploads/products/
$basePath = __DIR__;

// Extract file path from request
// URL format: /api/uploads/logos/filename.png or /api/uploads/products/filename.jpg
$pathParts = explode('/api/uploads/', $requestUri);
if (count($pathParts) < 2) {
    http_response_code(404);
    exit('File not found');
}

// pathParts[1] will be like "logos/filename.png" or "products/filename.jpg"
$relativePath = $pathParts[1];
$filePath = $basePath . '/' . $relativePath;

// Security: Prevent directory traversal
$realBasePath = realpath($basePath);
$realFilePath = realpath($filePath);

if ($realFilePath === false || strpos($realFilePath, $realBasePath) !== 0) {
    http_response_code(403);
    exit('Access denied');
}

// Check if file exists
if (!file_exists($filePath) || !is_file($filePath)) {
    http_response_code(404);
    exit('File not found');
}

// Get MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $filePath);
finfo_close($finfo);

// Set headers
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');

// Output file
readfile($filePath);
exit;

