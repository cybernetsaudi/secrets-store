-- Add Tamara payment gateway
-- Run this migration BEFORE deploying. Credentials are configured via Admin Panel.
-- DO NOT hardcode credentials - add them in Admin > Settings > Payment Gateways.

-- Extend gateway_type enum to include 'tamara' (MySQL 8.0+ uses ALTER for enum)
ALTER TABLE `payment_gateways` 
MODIFY COLUMN `gateway_type` enum('stripe','tabby','bank_transfer','apple_pay','tamara','custom') NOT NULL;

-- Insert Tamara gateway (inactive, credentials to be set via admin panel)
INSERT INTO `payment_gateways` (
  `gateway_name`, `gateway_type`, `is_active`, `is_test_mode`,
  `api_key`, `api_secret`, `public_key`, `webhook_secret`, `merchant_id`
) VALUES (
  'Tamara', 'tamara', 0, 0,
  NULL, NULL, NULL, NULL, NULL
) ON DUPLICATE KEY UPDATE `gateway_name` = 'Tamara';
