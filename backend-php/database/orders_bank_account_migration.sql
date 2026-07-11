-- Add bank_account_id to orders table
-- This stores which bank account the customer selected for bank transfer payments

ALTER TABLE `orders`
ADD COLUMN `bank_account_id` bigint(20) UNSIGNED NULL AFTER `payment_method`,
ADD KEY `bank_account_id` (`bank_account_id`),
ADD CONSTRAINT `fk_orders_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL;


