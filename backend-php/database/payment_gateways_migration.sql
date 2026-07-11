-- Payment Gateway Configuration Table
-- Stores API credentials and settings for different payment gateways

CREATE TABLE IF NOT EXISTS `payment_gateways` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `gateway_name` varchar(50) NOT NULL,
  `gateway_type` enum('stripe','tabby','bank_transfer','apple_pay','custom') NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `is_test_mode` tinyint(1) DEFAULT 1,
  `api_key` text,
  `api_secret` text,
  `public_key` text,
  `webhook_secret` text,
  `merchant_id` varchar(255) DEFAULT NULL,
  `additional_config` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gateway_name` (`gateway_name`),
  KEY `gateway_type` (`gateway_type`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default payment gateways (inactive, to be configured)
INSERT INTO `payment_gateways` (`gateway_name`, `gateway_type`, `is_active`, `is_test_mode`, `api_key`, `api_secret`, `public_key`) VALUES
('Stripe', 'stripe', 0, 1, '', '', ''),
('Tabby', 'tabby', 0, 1, '', '', ''),
('Bank Transfer', 'bank_transfer', 1, 0, NULL, NULL, NULL),
('Apple Pay', 'apple_pay', 0, 1, '', '', '')
ON DUPLICATE KEY UPDATE `gateway_name`=`gateway_name`;


