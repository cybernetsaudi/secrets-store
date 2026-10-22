-- Add collection column for GATVIA product lines (classic, premium, designer, limited)
ALTER TABLE `products`
  ADD COLUMN IF NOT EXISTS `collection` varchar(50) DEFAULT 'classic'
  COMMENT 'Product line: classic, premium, designer, limited';

CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection);

-- Existing GUFC products default to classic until re-tagged in admin
UPDATE `products` SET `collection` = 'classic' WHERE `collection` IS NULL OR `collection` = '';
