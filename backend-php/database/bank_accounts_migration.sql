-- Bank Accounts Table
-- Allows multiple bank accounts per payment gateway
-- Customers can choose which bank account to use for transfer

CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `gateway_id` bigint(20) UNSIGNED NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `account_number` varchar(100) NOT NULL,
  `iban` varchar(100) DEFAULT NULL,
  `swift_code` varchar(50) DEFAULT NULL,
  `branch` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `staff_email` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `gateway_id` (`gateway_id`),
  KEY `is_active` (`is_active`),
  CONSTRAINT `fk_bank_accounts_gateway` FOREIGN KEY (`gateway_id`) REFERENCES `payment_gateways` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing bank account data from payment_gateways to bank_accounts
-- This preserves any existing bank account information
INSERT INTO `bank_accounts` (
  `gateway_id`, 
  `account_name`, 
  `bank_name`, 
  `account_number`, 
  `iban`, 
  `swift_code`, 
  `branch`, 
  `address`,
  `is_active`,
  `display_order`
)
SELECT 
  `id` as `gateway_id`,
  COALESCE(`bank_account_name`, 'Gulf United FC') as `account_name`,
  COALESCE(`bank_name`, 'Your Bank Name') as `bank_name`,
  COALESCE(`bank_account_number`, '') as `account_number`,
  `bank_iban` as `iban`,
  `bank_swift` as `swift_code`,
  `bank_branch` as `branch`,
  `bank_address` as `address`,
  1 as `is_active`,
  0 as `display_order`
FROM `payment_gateways`
WHERE `gateway_type` = 'bank_transfer'
  AND (`bank_account_name` IS NOT NULL OR `bank_name` IS NOT NULL OR `bank_account_number` IS NOT NULL);

