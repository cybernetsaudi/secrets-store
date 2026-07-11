-- Add staff_email column to bank_accounts table if it doesn't exist
ALTER TABLE `bank_accounts` 
ADD COLUMN IF NOT EXISTS `staff_email` varchar(255) DEFAULT NULL AFTER `address`;


