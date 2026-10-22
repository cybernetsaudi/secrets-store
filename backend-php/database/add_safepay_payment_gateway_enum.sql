-- Allow safepay in payments.gateway enum (was causing empty gateway on insert)

ALTER TABLE `payments`
  MODIFY COLUMN `gateway` enum(
    'stripe','apple_pay','bank_transfer','tabby','tamara','ngenius','safepay'
  ) NOT NULL;
