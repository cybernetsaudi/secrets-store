-- Apparel-style variant dimensions (color, size, cup) + optional compare-at price
-- Run once: php scripts/migrate_variant_dimensions.php

ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `compare_at_price` DECIMAL(10,2) DEFAULT NULL AFTER `base_price`;

ALTER TABLE `product_variants`
  ADD COLUMN IF NOT EXISTS `option_color` VARCHAR(100) DEFAULT NULL AFTER `name`,
  ADD COLUMN IF NOT EXISTS `option_size` VARCHAR(50) DEFAULT NULL AFTER `option_color`,
  ADD COLUMN IF NOT EXISTS `option_cup` VARCHAR(20) DEFAULT NULL AFTER `option_size`,
  ADD COLUMN IF NOT EXISTS `swatch_image` VARCHAR(255) DEFAULT NULL AFTER `option_cup`;
