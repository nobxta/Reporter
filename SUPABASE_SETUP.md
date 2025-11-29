# Supabase Setup Guide

This guide will help you set up Supabase for the TG Report Shield application.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: Choose a name (e.g., "tg-report-shield")
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose the closest region
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find:
   - **Project URL**: Copy this to `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key**: Copy this to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key**: Copy this to `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Step 3: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase-schema.sql` from this project
4. Click "Run" to execute the SQL
5. You should see success messages for:
   - `reports` table created
   - `settings` table created
   - Indexes created
   - Default settings inserted

## Step 4: Verify Tables

1. Go to **Table Editor** in your Supabase dashboard
2. You should see two tables:
   - `reports` - Stores all your reports
   - `settings` - Stores application settings
3. Click on `settings` table - you should see one row with default values

## Step 5: Configure Row Level Security (RLS)

The schema already includes RLS policies that allow the service role to access everything. For production, you might want to add more restrictive policies.

To verify RLS is enabled:
1. Go to **Authentication** → **Policies**
2. You should see policies for both tables

## Step 6: Add Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure all three Supabase variables are set in `.env.local`
- Restart your development server after adding variables

### "relation does not exist" error
- Make sure you ran the SQL schema in Step 3
- Check that tables exist in Table Editor

### "permission denied" error
- Verify RLS policies are set correctly
- Make sure you're using the service role key (not anon key) for server operations

### Settings not saving
- Check that the `settings` table exists
- Verify the default row was created (id = 'default')

## Next Steps

After setting up Supabase:
1. Configure your email settings (SMTP)
2. Set up your Telegram bot
3. Add your admin password
4. Start using the application!

All reports and settings will now be stored in Supabase and persist across server restarts.

