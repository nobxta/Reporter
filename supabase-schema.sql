-- Supabase Database Schema for TG Report Shield
-- Run this SQL in your Supabase SQL Editor

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'banned')),
  complaint_subject TEXT,
  complaint_body TEXT,
  email_sent_at TIMESTAMPTZ,
  banned_at TIMESTAMPTZ,
  last_checked TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_last_checked ON reports(last_checked);

-- Create settings table (single row)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  support_emails TEXT[] NOT NULL DEFAULT ARRAY['abuse@telegram.org'],
  check_interval_minutes INTEGER NOT NULL DEFAULT 2 CHECK (check_interval_minutes >= 1 AND check_interval_minutes <= 120),
  telegram_chat_id TEXT,
  notify_on_no_ban BOOLEAN NOT NULL DEFAULT false,
  checker_bot_tokens TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (id, support_emails, check_interval_minutes, telegram_chat_id, notify_on_no_ban, checker_bot_tokens)
VALUES ('default', ARRAY['abuse@telegram.org'], 2, NULL, false, ARRAY[]::TEXT[])
ON CONFLICT (id) DO NOTHING;

-- Add notify_on_no_ban column if it doesn't exist (for existing databases)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS notify_on_no_ban BOOLEAN NOT NULL DEFAULT false;

-- Add checker_bot_tokens column if it doesn't exist (for existing databases)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS checker_bot_tokens TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Enable Row Level Security (RLS)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow service role to do everything)
-- In production, you might want more restrictive policies
CREATE POLICY "Service role can do everything on reports" ON reports
  FOR ALL USING (true);

CREATE POLICY "Service role can do everything on settings" ON settings
  FOR ALL USING (true);

-- Optional: Create a view for easier querying
CREATE OR REPLACE VIEW reports_view AS
SELECT 
  id,
  target,
  violation_type,
  description,
  evidence,
  notes,
  status,
  complaint_subject,
  complaint_body,
  email_sent_at,
  banned_at,
  last_checked,
  created_at,
  CASE 
    WHEN status = 'banned' THEN 'Banned'
    WHEN status = 'sent' THEN 'Sent'
    ELSE 'Pending'
  END as status_label
FROM reports;

