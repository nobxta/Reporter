-- Migration: Add checker_bot_tokens column to settings table
-- Run this in Supabase SQL Editor if you already have the settings table

-- Add checker_bot_tokens column if it doesn't exist
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS checker_bot_tokens TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Update existing row to have empty array if NULL
UPDATE settings 
SET checker_bot_tokens = ARRAY[]::TEXT[] 
WHERE checker_bot_tokens IS NULL;

