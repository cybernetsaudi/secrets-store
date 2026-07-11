-- Admin Panel and Conversion Features Database Schema
-- Run this after the main migrations.sql

-- Admin Users Table
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','staff') DEFAULT 'staff',
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin Sessions Table (for session management)
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `id` varchar(128) NOT NULL,
  `admin_user_id` bigint(20) UNSIGNED NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `data` text,
  PRIMARY KEY (`id`),
  KEY `admin_user_id` (`admin_user_id`),
  KEY `last_activity` (`last_activity`),
  FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Abandoned Carts Table
CREATE TABLE IF NOT EXISTS `abandoned_carts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `guest_email` varchar(255) NOT NULL,
  `guest_name` varchar(255) DEFAULT NULL,
  `guest_phone` varchar(50) DEFAULT NULL,
  `cart_data` json NOT NULL,
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `currency` varchar(3) DEFAULT 'AED',
  `discount_code` varchar(50) DEFAULT NULL,
  `session_id` varchar(128) DEFAULT NULL,
  `abandoned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reminder_sent_at` timestamp NULL DEFAULT NULL,
  `reminder_count` int(11) DEFAULT 0,
  `recovered` tinyint(1) DEFAULT 0,
  `recovered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `guest_email` (`guest_email`),
  KEY `abandoned_at` (`abandoned_at`),
  KEY `reminder_sent_at` (`reminder_sent_at`),
  KEY `recovered` (`recovered`),
  KEY `session_id` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings Table (for email and other config)
CREATE TABLE IF NOT EXISTS `settings` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` text,
  `type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`),
  KEY `updated_by` (`updated_by`),
  FOREIGN KEY (`updated_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOTE: Default admin user creation removed for security
-- Use scripts/create_admin.php to create the first admin user
-- Example: php scripts/create_admin.php admin admin@example.com SecurePassword123

-- Insert default email settings (will be updated via admin panel)
INSERT INTO `settings` (`key`, `value`, `type`, `description`) VALUES
('email_host', '', 'string', 'SMTP Host'),
('email_port', '587', 'string', 'SMTP Port'),
('email_username', '', 'string', 'SMTP Username'),
('email_password', '', 'string', 'SMTP Password (encrypted)'),
('email_from', '', 'string', 'From Email Address'),
('email_from_name', 'Gulf United FC', 'string', 'From Name'),
('staff_email', '', 'string', 'Staff Notification Email')
ON DUPLICATE KEY UPDATE `key`=`key`;

