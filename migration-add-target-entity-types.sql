-- Migration: Add target_type and entity_type columns to reports table
-- Run this SQL in your Supabase SQL Editor

-- Add target_type column (link or username)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS target_type TEXT CHECK (target_type IN ('link', 'username')) DEFAULT 'username';

-- Add entity_type column (channel, group, or account)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS entity_type TEXT CHECK (entity_type IN ('channel', 'group', 'account')) DEFAULT 'account';

-- Update existing records to infer types from target field
-- If target contains 't.me/', it's likely a link, otherwise username
UPDATE reports 
SET target_type = CASE 
  WHEN target LIKE '%t.me/%' OR target LIKE 'http%' THEN 'link'
  ELSE 'username'
END
WHERE target_type IS NULL;

-- For entity_type, default to 'account' for existing records
-- Users can update manually if needed
UPDATE reports 
SET entity_type = 'account'
WHERE entity_type IS NULL;

-- Create index for better querying
CREATE INDEX IF NOT EXISTS idx_reports_target_type ON reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_entity_type ON reports(entity_type);

