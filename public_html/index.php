<?php
/**
 * Landing page
 * Beautiful landing page with GUFC-verse button and confetti animation
 */

// Check if this is an API request (shouldn't happen, but safety check)
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
    // Let .htaccess handle API routing
    return false;
}

// Don't serve landing page if user is requesting index.html directly
if (basename($_SERVER['REQUEST_URI']) === 'index.html' || 
    (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/index.html') !== false)) {
    // Let .htaccess serve index.html
    return false;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gulf United FC - Welcome to GUFC-verse</title>
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
            overflow: hidden;
            position: relative;
        }
        .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #fff;
            top: -10px;
            z-index: 1;
            animation: fall linear infinite;
        }
        @keyframes fall {
            from {
                transform: translateY(0) rotate(0deg);
            }
            to {
                transform: translateY(100vh) rotate(360deg);
            }
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
            z-index: 10;
            position: relative;
        }
        #confetti-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            overflow: hidden;
        }
        .logo-container {
            margin-bottom: 2rem;
        }
        .logo {
            width: 150px;
            height: 150px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            font-size: 3rem;
            font-weight: bold;
            color: #DC143C;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
        }
        .logo img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.95;
        }
        .btn {
            display: inline-block;
            padding: 1.5rem 3rem;
            background: white;
            color: #DC143C;
            text-decoration: none;
            border-radius: 12px;
            font-weight: bold;
            font-size: 1.3rem;
            transition: all 0.3s;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .btn:hover {
            transform: scale(1.1);
            box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        }
    </style>
</head>
<body>
    <!-- Confetti Animation -->
    <div id="confetti-container"></div>
    
    <div class="container">
        <div class="logo-container">
            <div class="logo">
                <?php
                // Try to fetch logo from settings API
                $logoUrl = null;
                try {
                    // Include database connection - use correct path
                    $apiPath = __DIR__ . '/api';
                    if (file_exists($apiPath . '/vendor/autoload.php')) {
                        require_once $apiPath . '/vendor/autoload.php';
                        require_once $apiPath . '/src/Models/Setting.php';
                        require_once $apiPath . '/src/Core/Database.php';
                        
                        $logoUrl = \App\Models\Setting::get('site_logo_url', '');
                    }
                } catch (Exception $e) {
                    // Silently fail - use fallback
                    error_log("Landing page logo error: " . $e->getMessage());
                }
                
                // Build base URL dynamically so the same code works on multiple domains
                $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'] ?? 'secrets.gatvia.com';
                $baseUrl = $scheme . '://' . $host;
                
                if ($logoUrl && !empty($logoUrl)) {
                    // Use logo from settings
                    if (strpos($logoUrl, 'http') === 0) {
                        // Already absolute URL
                        $fullUrl = $logoUrl;
                    } elseif (strpos($logoUrl, '/api/') === 0) {
                        // Relative path starting with /api/ - prepend domain only
                        $fullUrl = $baseUrl . $logoUrl;
                    } else {
                        // Other relative path - prepend API URL
                        $fullUrl = $baseUrl . '/api' . $logoUrl;
                    }
                    echo '<img src="' . htmlspecialchars($fullUrl) . '" alt="Gulf United FC Logo" onerror="this.parentElement.innerHTML=\'GUFC\';">';
                } else {
                    // Fallback to local files
                    $logoPath = __DIR__ . '/logo.png';
                    $logoSvg = __DIR__ . '/logo.svg';
                    $logoJpg = __DIR__ . '/logo.jpg';
                    
                    if (file_exists($logoPath)) {
                        echo '<img src="/logo.png" alt="Gulf United FC Logo" onerror="this.parentElement.innerHTML=\'GUFC\';">';
                    } elseif (file_exists($logoSvg)) {
                        echo '<img src="/logo.svg" alt="Gulf United FC Logo" onerror="this.parentElement.innerHTML=\'GUFC\';">';
                    } elseif (file_exists($logoJpg)) {
                        echo '<img src="/logo.jpg" alt="Gulf United FC Logo" onerror="this.parentElement.innerHTML=\'GUFC\';">';
                    } else {
                        echo '<span style="font-size: 3rem; font-weight: bold;">GUFC</span>';
                    }
                }
                ?>
            </div>
        </div>
        <h1>Welcome to GUFC-verse</h1>
        <p class="subtitle">Gulf United FC Academy Store</p>
        <button type="button" class="btn" id="enter-btn" style="border: none; cursor: pointer;">Click to Enter GUFC-verse</button>
    </div>

    <script>
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', function() {
            // Confetti animation
            const colors = ['#DC143C', '#003366', '#FFFFFF'];
            const confettiContainer = document.getElementById('confetti-container');
            
            function createConfetti() {
                if (!confettiContainer) return;
                
                for (let i = 0; i < 50; i++) {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.position = 'absolute';
                    confetti.style.width = '10px';
                    confetti.style.height = '10px';
                    confetti.style.left = Math.random() * 100 + '%';
                    confetti.style.top = '-10px';
                    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                    confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                    confetti.style.animationDelay = Math.random() * 2 + 's';
                    confetti.style.opacity = Math.random();
                    confetti.style.zIndex = '1';
                    confettiContainer.appendChild(confetti);
                }
            }
            
            createConfetti();
            
            // Add more confetti periodically
            setInterval(() => {
                if (!confettiContainer) return;
                
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.position = 'absolute';
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '-10px';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                confetti.style.opacity = Math.random();
                confetti.style.zIndex = '1';
                confettiContainer.appendChild(confetti);
                
                // Remove after animation
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.remove();
                    }
                }, 5000);
            }, 300);
            
            // Fix button navigation - navigate directly to store (index.html)
            const enterBtn = document.getElementById('enter-btn');
            if (enterBtn) {
                enterBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    // Navigate directly to index.html (the store)
                    window.location.href = '/index.html';
                });
            }
        });
    </script>
</body>
</html>

