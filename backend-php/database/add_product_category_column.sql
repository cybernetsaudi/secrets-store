-- Product category within a collection line (e.g. silk-satin under premium)
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `product_category` varchar(80) DEFAULT NULL
  COMMENT 'Category slug within collection: bras-bralettes, silk-satin, etc.';

CREATE INDEX IF NOT EXISTS idx_products_product_category ON products(product_category);
