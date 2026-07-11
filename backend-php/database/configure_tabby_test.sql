-- Configure Tabby Test Credentials
-- Run this SQL script to update Tabby gateway with test API keys from Tabby support

-- Update Tabby gateway with test credentials
UPDATE `payment_gateways` 
SET 
    `api_secret` = 'sk_test_01956b47-9761-fd31-cb12-6dfcacf3c59c',
    `public_key` = 'pk_test_01956b47-9761-fd31-cb12-6dfc6adaf5b3',
    `merchant_id` = 'GUFC',
    `is_test_mode` = 1,
    `is_active` = 1,
    `updated_at` = NOW()
WHERE `gateway_type` = 'tabby';

-- Verify the update
SELECT 
    id,
    gateway_name,
    gateway_type,
    is_active,
    is_test_mode,
    merchant_id,
    LEFT(public_key, 20) as public_key_preview,
    LEFT(api_secret, 20) as secret_key_preview,
    updated_at
FROM `payment_gateways`
WHERE `gateway_type` = 'tabby';



