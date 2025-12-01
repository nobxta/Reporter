-- Migration: Update check_interval_minutes constraint to allow values up to 120 minutes
-- Run this in Supabase SQL Editor if you already have the settings table

-- Drop the old constraint
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_check_interval_minutes_check;

-- Add new constraint allowing 1-120 minutes
ALTER TABLE settings 
ADD CONSTRAINT settings_check_interval_minutes_check 
CHECK (check_interval_minutes >= 1 AND check_interval_minutes <= 120);

