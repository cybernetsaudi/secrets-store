-- Migration: Add player fields to orders table
-- Date: 2024
-- Description: Add player_name, player_date_of_birth, and trial_coach_name fields to orders table

ALTER TABLE `orders` 
ADD COLUMN `player_name` VARCHAR(200) NULL AFTER `guest_phone`,
ADD COLUMN `player_date_of_birth` DATE NULL AFTER `player_name`,
ADD COLUMN `trial_coach_name` VARCHAR(200) NULL AFTER `player_date_of_birth`;





