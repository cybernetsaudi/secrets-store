<?php
/**
 * Landing page for the store
 * Redirects to frontend or shows store
 */

// Check if frontend is built and available
$frontendPath = __DIR__ . '/frontend/.next';
$frontendIndex = __DIR__ . '/frontend/out/index.html';

// If Next.js static export exists, serve it
if (file_exists($frontendIndex)) {
    header('Location: /frontend/');
    exit;
}

// Otherwise, show a simple landing page with link to store
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gulf United FC - Academy Store</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #DC143C 0%, #003366 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
        }
        .logo {
            width: 120px;
            height: 120px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            font-size: 2.5rem;
            font-weight: bold;
            color: #DC143C;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: white;
            color: #DC143C;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 1.1rem;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: scale(1.05);
        }
        .info {
            margin-top: 2rem;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">GUFC</div>
        <h1>Gulf United FC</h1>
        <p>Academy Store</p>
        <a href="/frontend/" class="btn">Enter Store</a>
        <div class="info">
            <p>Store is being set up. Please check back soon!</p>
            <p style="font-size: 0.8rem; margin-top: 0.5rem;">API Status: <a href="/api/products" style="color: #90EE90;">Check API</a></p>
        </div>
    </div>
</body>
</html>


