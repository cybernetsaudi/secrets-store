-- Update Tabby Production API Keys
-- Production keys provided by user

UPDATE `payment_gateways` 
SET 
    `api_secret` = 'sk_01956b47-9761-fd31-cb12-6dfbb14b2e93',
    `public_key` = 'pk_01956b47-9761-fd31-cb12-6dfb5b2b4087',
    `merchant_id` = 'GUFC',
    `is_test_mode` = 0,
    `is_active` = 1,
    `updated_at` = NOW()
WHERE `gateway_type` = 'tabby';

-- Verify update
SELECT 
    id,
    gateway_type,
    is_test_mode,
    is_active,
    LEFT(api_secret, 25) as api_secret_prefix,
    LEFT(public_key, 25) as public_key_prefix,
    merchant_id,
    updated_at
FROM `payment_gateways` 
WHERE `gateway_type` = 'tabby';

