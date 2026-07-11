<?php

namespace App\Core;

class Router
{
    private array $routes = [];
    private string $basePath = '/api';
    
    public function get(string $path, callable|array $handler): void
    {
        $this->addRoute('GET', $path, $handler);
    }
    
    public function post(string $path, callable|array $handler): void
    {
        $this->addRoute('POST', $path, $handler);
    }
    
    public function put(string $path, callable|array $handler): void
    {
        $this->addRoute('PUT', $path, $handler);
    }
    
    public function delete(string $path, callable|array $handler): void
    {
        $this->addRoute('DELETE', $path, $handler);
    }
    
    private function addRoute(string $method, string $path, callable|array $handler): void
    {
        // Don't add basePath - routes are already relative
        // The basePath is only used for matching, not for registration
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'pattern' => $this->pathToRegex($path)
        ];
    }
    
    private function pathToRegex(string $path): string
    {
        $pattern = preg_replace('/\{(\w+)\}/', '([^/]+)', $path);
        return '#^' . $pattern . '$#';
    }
    
    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        
        // Handle method override for POST requests (for file uploads with _method=PUT)
        if ($method === 'POST') {
            // Check for _method in POST data (for FormData)
            if (isset($_POST['_method'])) {
                $overrideMethod = strtoupper($_POST['_method']);
                if (in_array($overrideMethod, ['PUT', 'DELETE', 'PATCH'])) {
                    $method = $overrideMethod;
                }
            }
            // Also check for X-HTTP-Method-Override header (for JSON requests)
            elseif (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
                $overrideMethod = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
                if (in_array($overrideMethod, ['PUT', 'DELETE', 'PATCH'])) {
                    $method = $overrideMethod;
                }
            }
        }
        
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Remove /api prefix if present
        // The .htaccess rewrites /api/xyz to api/index.php, but REQUEST_URI still has /api/
        if (strpos($uri, '/api') === 0) {
            $uri = substr($uri, 4); // Remove '/api'
            if ($uri === '' || $uri === '/') {
                $uri = '/';
            }
        }
        
        // Ensure URI starts with /
        if ($uri !== '/' && $uri[0] !== '/') {
            $uri = '/' . $uri;
        }
        
        // Normalize trailing slash (except for root) so /admin/settings/github-token/ matches
        if ($uri !== '/' && strlen($uri) > 1 && substr($uri, -1) === '/') {
            $uri = rtrim($uri, '/');
        }
        
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match($route['pattern'], $uri, $matches)) {
                array_shift($matches); // Remove full match
                
                // Check if this is an admin route (requires authentication)
                // Check both with and without /api prefix
                $checkUri = $uri;
                $isAdminRoute = strpos($checkUri, '/admin/') === 0;
                $isLoginRoute = $checkUri === '/admin/login';
                $isWebhookRoute = strpos($checkUri, '/webhooks/') !== false;
                
                if ($isAdminRoute && !$isLoginRoute) {
                    \App\Core\Auth::requireAuth();
                    
                    // CSRF protection for state-changing admin requests
                    // Exclude: GET requests, webhooks, login
                    if (in_array($method, ['POST', 'PUT', 'DELETE']) && !$isWebhookRoute) {
                        \App\Core\Auth::requireCsrfToken();
                    }
                }
                
                $handler = $route['handler'];
                
                if (is_array($handler)) {
                    $controller = new $handler[0]();
                    $methodName = $handler[1];
                    
                    // Convert string IDs to integers for route parameters
                    $params = [];
                    foreach ($matches as $match) {
                        $params[] = is_numeric($match) ? intval($match) : $match;
                    }
                    
                    $response = $controller->$methodName(...$params);
                } else {
                    $response = $handler(...$matches);
                }
                
                if (is_array($response) || is_object($response)) {
                    echo json_encode($response);
                } else {
                    echo $response;
                }
                
                return;
            }
        }
        
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
    }
}

