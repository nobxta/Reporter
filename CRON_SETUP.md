# External Cron Setup Guide

Since Vercel Hobby plan only allows daily cron jobs, we need to use an external cron service to check reports every 1-5 minutes.

## Quick Setup (Recommended: cron-job.org)

### Step 1: Get Your CRON_SECRET

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add or check for `CRON_SECRET`:
   - **Name**: `CRON_SECRET`
   - **Value**: Generate a secure random string (e.g., use a password generator)
   - **Environment**: Production (and Preview if needed)
4. Save the value - you'll need it for the cron service

### Step 2: Set Up cron-job.org

1. **Create Account**: Go to https://cron-job.org and sign up (free)

2. **Create New Cron Job**:
   - Click **"Create cronjob"**
   - **Title**: `TG Report Shield - Check Reports`
   - **Address (URL)**: `https://your-app-name.vercel.app/api/check-reports`
     - Replace `your-app-name` with your actual Vercel app name
   - **Schedule**: 
     - For every 2 minutes: `*/2 * * * *`
     - For every 3 minutes: `*/3 * * * *`
     - For every 5 minutes: `*/5 * * * *`
     - (Adjust based on your `CHECK_INTERVAL_MINUTES` setting)
   - **Request Method**: `GET`
   - **Request Headers**: Click **"Add Header"**
     - **Name**: `Authorization`
     - **Value**: `Bearer YOUR_CRON_SECRET`
       - Replace `YOUR_CRON_SECRET` with the value from Step 1
   - **Status**: Active
   - Click **"Create cronjob"**

3. **Test the Cron Job**:
   - Click **"Run now"** to test
   - Check your Vercel logs to see if the request was successful

### Step 3: Verify It's Working

1. Go to your app's History page
2. Create a test report and send it
3. Wait for the configured interval (2-5 minutes)
4. Check if the status updates automatically
5. Check your Telegram bot for ban notifications

## Alternative: EasyCron

1. Go to https://www.easycron.com
2. Sign up for free account
3. Create a new cron job with similar settings:
   - **URL**: `https://your-app-name.vercel.app/api/check-reports`
   - **HTTP Method**: `GET`
   - **HTTP Headers**: `Authorization: Bearer YOUR_CRON_SECRET`
   - **Schedule**: `*/2 * * * *` (every 2 minutes)

## Alternative: GitHub Actions (Free)

If you prefer using GitHub Actions:

1. Create `.github/workflows/check-reports.yml` in your repository:

```yaml
name: Check Reports
on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
  workflow_dispatch:  # Allows manual trigger

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Reports
        run: |
          curl -X GET "https://your-app-name.vercel.app/api/check-reports" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

2. Add `CRON_SECRET` to GitHub Secrets:
   - Go to your repository → **Settings** → **Secrets and variables** → **Actions**
   - Click **"New repository secret"**
   - **Name**: `CRON_SECRET`
   - **Value**: Your CRON_SECRET from Vercel
   - Click **"Add secret"**

## Troubleshooting

### Cron job not running?
- Check the cron service dashboard for errors
- Verify the URL is correct (including `https://`)
- Verify the Authorization header format: `Bearer YOUR_CRON_SECRET` (with space after Bearer)
- Check Vercel logs for API errors

### Getting 401 Unauthorized?
- Verify `CRON_SECRET` is set in Vercel environment variables
- Verify the header value matches exactly: `Bearer YOUR_CRON_SECRET`
- Make sure there's a space between "Bearer" and your secret

### Not checking at the right interval?
- The cron schedule should match your `CHECK_INTERVAL_MINUTES` setting
- The API respects `CHECK_INTERVAL_MINUTES` and only checks reports that haven't been checked recently
- You can call it more frequently (e.g., every minute) and the API will handle the interval logic

## Important Notes

- The external cron service will call your API endpoint
- The API endpoint checks the `CHECK_INTERVAL_MINUTES` setting and only processes reports that need checking
- You can set the cron to run every minute, and the API will respect the interval setting
- Make sure `CRON_SECRET` is a strong, random string for security

