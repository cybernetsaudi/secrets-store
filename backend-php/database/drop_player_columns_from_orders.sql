-- Remove legacy GUFC player fields from orders
ALTER TABLE `orders`
  DROP COLUMN `player_name`,
  DROP COLUMN `player_date_of_birth`,
  DROP COLUMN `trial_coach_name`;
