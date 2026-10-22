-- Add shipping address fields to orders (GATVIA Secrets)
ALTER TABLE `orders`
  ADD COLUMN `shipping_address_line1` VARCHAR(255) NULL AFTER `guest_phone`,
  ADD COLUMN `shipping_address_line2` VARCHAR(255) NULL AFTER `shipping_address_line1`,
  ADD COLUMN `shipping_city` VARCHAR(100) NULL AFTER `shipping_address_line2`,
  ADD COLUMN `shipping_state` VARCHAR(100) NULL AFTER `shipping_city`,
  ADD COLUMN `shipping_postal_code` VARCHAR(20) NULL AFTER `shipping_state`,
  ADD COLUMN `shipping_country` VARCHAR(2) NOT NULL DEFAULT 'PK' AFTER `shipping_postal_code`;
