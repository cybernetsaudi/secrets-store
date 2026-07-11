-- Performance Indexes Migration
-- Adds indexes to frequently queried fields for better performance

-- Orders table indexes
ALTER TABLE `orders` 
ADD INDEX IF NOT EXISTS `idx_guest_email` (`guest_email`),
ADD INDEX IF NOT EXISTS `idx_status` (`status`),
ADD INDEX IF NOT EXISTS `idx_created_at` (`created_at`),
ADD INDEX IF NOT EXISTS `idx_payment_status` (`payment_status`),
ADD INDEX IF NOT EXISTS `idx_order_number` (`order_number`);

-- Products table indexes
ALTER TABLE `products`
ADD INDEX IF NOT EXISTS `idx_is_active` (`is_active`),
ADD INDEX IF NOT EXISTS `idx_slug` (`slug`);

-- Product variants table indexes
ALTER TABLE `product_variants`
ADD INDEX IF NOT EXISTS `idx_product_id` (`product_id`),
ADD INDEX IF NOT EXISTS `idx_is_active` (`is_active`);

-- Product images table indexes
ALTER TABLE `product_images`
ADD INDEX IF NOT EXISTS `idx_product_id` (`product_id`),
ADD INDEX IF NOT EXISTS `idx_is_primary` (`is_primary`);

-- Payments table indexes
ALTER TABLE `payments`
ADD INDEX IF NOT EXISTS `idx_order_id` (`order_id`),
ADD INDEX IF NOT EXISTS `idx_transaction_id` (`transaction_id`),
ADD INDEX IF NOT EXISTS `idx_status` (`status`),
ADD INDEX IF NOT EXISTS `idx_gateway` (`gateway`);

-- Order items table indexes
ALTER TABLE `order_items`
ADD INDEX IF NOT EXISTS `idx_order_id` (`order_id`),
ADD INDEX IF NOT EXISTS `idx_product_id` (`product_id`);

-- Discount codes table indexes
ALTER TABLE `discount_codes`
ADD INDEX IF NOT EXISTS `idx_code` (`code`),
ADD INDEX IF NOT EXISTS `idx_is_active` (`is_active`);

-- Admin users table indexes
ALTER TABLE `admin_users`
ADD INDEX IF NOT EXISTS `idx_username` (`username`),
ADD INDEX IF NOT EXISTS `idx_email` (`email`),
ADD INDEX IF NOT EXISTS `idx_is_active` (`is_active`);

-- Settings table indexes
ALTER TABLE `settings`
ADD INDEX IF NOT EXISTS `idx_key` (`key`);

-- Currency exchanges table indexes
ALTER TABLE `currency_exchanges`
ADD INDEX IF NOT EXISTS `idx_currencies` (`from_currency`, `to_currency`),
ADD INDEX IF NOT EXISTS `idx_created_at` (`created_at`);







