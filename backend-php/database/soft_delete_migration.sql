-- Soft Delete Migration for Products
-- Adds deleted_at column to enable soft deletion while preserving order history
-- Run this migration: mysql -u [user] -p [database] < soft_delete_migration.sql

-- Check if column exists before adding (MySQL 5.7+ compatible)
SET @dbname = DATABASE();
SET @tablename = 'products';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` timestamp NULL DEFAULT NULL AFTER `updated_at`')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for faster queries filtering out deleted products (if it doesn't exist)
SET @indexname = 'idx_deleted_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  'SELECT 1', -- Index exists, do nothing
  CONCAT('ALTER TABLE `', @tablename, '` ADD INDEX `', @indexname, '` (`deleted_at`)')
));
PREPARE indexIfNotExists FROM @preparedStatement;
EXECUTE indexIfNotExists;
DEALLOCATE PREPARE indexIfNotExists;





