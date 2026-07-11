-- Add deleted_at column to products table for soft delete functionality
-- This allows products with orders to be soft-deleted (hidden from admin) 
-- while preserving order history

-- Check if column already exists before adding
SET @dbname = DATABASE();
SET @tablename = "products";
SET @columnname = "deleted_at";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 'Column already exists.' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " DATETIME NULL DEFAULT NULL;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for faster queries filtering out deleted products
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- Add comment to column
ALTER TABLE products MODIFY COLUMN deleted_at DATETIME NULL DEFAULT NULL COMMENT 'Soft delete timestamp - NULL means not deleted';





