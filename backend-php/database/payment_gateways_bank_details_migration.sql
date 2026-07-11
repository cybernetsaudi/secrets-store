-- Add bank account details fields to payment_gateways table
-- For bank_transfer payment method

ALTER TABLE `payment_gateways` 
ADD COLUMN IF NOT EXISTS `bank_account_name` varchar(255) DEFAULT NULL AFTER `merchant_id`,
ADD COLUMN IF NOT EXISTS `bank_name` varchar(255) DEFAULT NULL AFTER `bank_account_name`,
ADD COLUMN IF NOT EXISTS `bank_account_number` varchar(100) DEFAULT NULL AFTER `bank_name`,
ADD COLUMN IF NOT EXISTS `bank_iban` varchar(100) DEFAULT NULL AFTER `bank_account_number`,
ADD COLUMN IF NOT EXISTS `bank_swift` varchar(50) DEFAULT NULL AFTER `bank_iban`,
ADD COLUMN IF NOT EXISTS `bank_branch` varchar(255) DEFAULT NULL AFTER `bank_swift`,
ADD COLUMN IF NOT EXISTS `bank_address` text DEFAULT NULL AFTER `bank_branch`,
ADD COLUMN IF NOT EXISTS `staff_email` varchar(255) DEFAULT NULL AFTER `bank_address`;

-- Update Bank Transfer gateway with placeholder values (can be edited via admin panel)
UPDATE `payment_gateways` 
SET 
  `bank_account_name` = 'Gulf United FC',
  `bank_name` = NULL,
  `bank_account_number` = NULL,
  `bank_iban` = NULL,
  `bank_swift` = NULL,
  `bank_branch` = NULL,
  `bank_address` = NULL,
  `staff_email` = NULL
WHERE `gateway_type` = 'bank_transfer';


