-- Add missing payment methods to ENUM columns
-- Required for Network.ae (N-Genius) + Tamara to be stored correctly.
--
-- Without this, MySQL/MariaDB may store unknown ENUM values as empty string (''),
-- which breaks downstream status verification.

-- Orders: allow tamara + ngenius
ALTER TABLE `orders`
  MODIFY `payment_method` enum('stripe','apple_pay','bank_transfer','tabby','tamara','ngenius') DEFAULT NULL;

-- Payments: allow tamara + ngenius
ALTER TABLE `payments`
  MODIFY `gateway` enum('stripe','apple_pay','bank_transfer','tabby','tamara','ngenius') NOT NULL;

-- Payment gateways config: allow ngenius (and tamara if not already present)
ALTER TABLE `payment_gateways`
  MODIFY `gateway_type` enum('stripe','tabby','bank_transfer','apple_pay','tamara','ngenius','custom') NOT NULL;

