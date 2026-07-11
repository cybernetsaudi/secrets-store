<?php

namespace App\Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;
    
    private function __construct() {}
    
    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            // Require environment variables - no hardcoded fallbacks for security
            $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST');
            $dbname = $_ENV['DB_NAME'] ?? getenv('DB_NAME');
            $username = $_ENV['DB_USER'] ?? getenv('DB_USER');
            $password = $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD');
            $port = $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '3306';
            
            // Validate required credentials
            if (empty($host) || empty($dbname) || empty($username) || empty($password)) {
                throw new \Exception("Database credentials not configured. Please set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env file.");
            }
            
            // Handle password with special characters - remove quotes if present
            $password = trim($password, "'\"");
            
            // Build DSN with proper escaping
            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            try {
                self::$instance = new PDO($dsn, $username, $password, $options);
            } catch (PDOException $e) {
                throw new \Exception("Database connection failed: " . $e->getMessage());
            }
        }
        
        return self::$instance;
    }
    
    public static function query(string $sql, array $params = []): \PDOStatement
    {
        try {
            $db = self::getInstance();
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            // Log the full error with SQL and params for debugging
            error_log("Database::query error - SQL: " . $sql);
            error_log("Database::query error - Params: " . json_encode($params));
            error_log("Database::query error - Message: " . $e->getMessage());
            error_log("Database::query error - Code: " . $e->getCode());
            throw $e; // Re-throw so calling code can handle it
        }
    }
}

