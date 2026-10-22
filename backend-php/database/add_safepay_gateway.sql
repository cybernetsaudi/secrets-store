-- Add Safepay payment gateway support

ALTER TABLE `payment_gateways`
  MODIFY COLUMN `gateway_type` enum(
    'stripe','tabby','bank_transfer','apple_pay','tamara','ngenius','safepay','custom'
  ) NOT NULL;

ALTER TABLE `orders`
  MODIFY COLUMN `payment_method` enum(
    'stripe','apple_pay','bank_transfer','tabby','tamara','ngenius','safepay'
  ) DEFAULT NULL;

INSERT INTO `payment_gateways` (
  `gateway_name`,
  `gateway_type`,
  `is_active`,
  `is_test_mode`,
  `public_key`,
  `api_secret`
) VALUES (
  'Safepay',
  'safepay',
  1,
  1,
  '',
  ''
) ON DUPLICATE KEY UPDATE
  `gateway_name` = VALUES(`gateway_name`),
  `updated_at` = NOW();
