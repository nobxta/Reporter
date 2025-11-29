# Complete Environment Variables Configuration

This document shows all environment variables required and optional for the TG Report Shield application.

## Complete .env.local File

Create a `.env.local` file in the root directory with the following variables:

```env
# ============================================
# SUPABASE CONFIGURATION (REQUIRED)
# ============================================
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase anonymous/public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase service role key (for server-side operations)
# WARNING: Keep this secret! Never expose it in client-side code
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# ADMIN AUTHENTICATION (REQUIRED)
# ============================================
# Password for admin login
ADMIN_PASSWORD=your-strong-password-here

# ============================================
# EMAIL CONFIGURATION (REQUIRED for sending reports)
# ============================================
# SMTP server host (default: smtp.gmail.com)
SMTP_HOST=smtp.gmail.com

# SMTP server port (default: 587)
SMTP_PORT=587

# Use secure connection (true/false, default: false)
# Set to "true" for port 465, "false" for port 587
SMTP_SECURE=false

# Your email address for SMTP authentication
SMTP_USER=your-email@gmail.com

# Your email password or app password
# For Gmail: Use App Password (not regular password)
# Generate at: https://myaccount.google.com/apppasswords
SMTP_PASSWORD=your-app-password

# Email "from" address (defaults to SMTP_USER if not set)
SMTP_FROM=your-email@gmail.com

# ============================================
# TELEGRAM BOT CONFIGURATION (REQUIRED for notifications)
# ============================================
# Bot token from @BotFather
TELEGRAM_BOT_TOKEN=your-bot-token-here

# ============================================
# TELEGRAM MTProto CONFIGURATION (REQUIRED for username resolution)
# ============================================
# Get these from https://my.telegram.org/apps
# API ID (numeric)
TELEGRAM_API_ID=your-api-id-here

# API Hash (string)
TELEGRAM_API_HASH=your-api-hash-here

# ============================================
# OPTIONAL FALLBACK VALUES (Can be managed in Settings page)
# ============================================
# These are ONLY used as fallbacks if Settings table is empty or fails to load
# Once you configure them in the Settings page, these env vars are ignored
# You can safely remove them after initial setup

# Telegram support email (fallback - managed in Settings page)
TELEGRAM_SUPPORT_EMAIL=abuse@telegram.org

# Telegram chat ID (fallback - managed in Settings page)
# Get your chat ID from @userinfobot or by sending a message to your bot
TELEGRAM_CHAT_ID=your-chat-id-here

# Check interval in minutes (1-5, fallback - managed in Settings page)
# How often to check if reported targets are banned
CHECK_INTERVAL_MINUTES=2

# ============================================
# CRON JOB CONFIGURATION (OPTIONAL)
# ============================================
# Secret key for authenticating cron job calls
# Used when calling /api/check-reports from external cron services
CRON_SECRET=your-secret-key-here

# Your application URL (optional, defaults to http://localhost:3000)
# Used for cron scheduler in development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Variable Details

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` |
| `ADMIN_PASSWORD` | Password for admin login | `mySecurePassword123` |
| `SMTP_USER` | Your email address | `your-email@gmail.com` |
| `SMTP_PASSWORD` | Email password/app password | `abcd efgh ijkl mnop` |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` |
| `TELEGRAM_API_ID` | API ID from my.telegram.org | `26481096` |
| `TELEGRAM_API_HASH` | API Hash from my.telegram.org | `490e357d5a2d4dae14b23fa74087f17d` |

### Optional Fallback Variables (Managed in Settings Page)

These variables are **only used as fallbacks** if the Settings table is empty or fails to load. Once you configure them in the Settings page (`/settings`), these environment variables are **ignored**. You can safely remove them after initial setup.

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_SUPPORT_EMAIL` | `abuse@telegram.org` | Support email (fallback) |
| `TELEGRAM_CHAT_ID` | `null` | Telegram chat ID (fallback) |
| `CHECK_INTERVAL_MINUTES` | `2` | Check interval in minutes (fallback) |

### Optional Variables (with defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_SECURE` | `false` | Use SSL/TLS (true for port 465) |
| `SMTP_FROM` | `SMTP_USER` | Email "from" address |
| `CRON_SECRET` | `dev-secret` | Secret for cron authentication |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Application URL |

## Setup Instructions

### 1. Admin Password
- Choose a strong password
- Store it securely

### 2. Email Configuration (Gmail Example)
1. Enable 2-factor authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Use the generated password in `SMTP_PASSWORD`
5. Use your Gmail address in `SMTP_USER` and `SMTP_FROM`

### 3. Telegram Bot Setup
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow instructions
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`
4. Get your chat ID:
   - Option 1: Message [@userinfobot](https://t.me/userinfobot) and copy your ID
   - Option 2: Send a message to your bot, then check the chat ID
5. Add chat ID to `TELEGRAM_CHAT_ID`

### 3.1. Telegram MTProto Setup (Required for Username Resolution)
1. Go to https://my.telegram.org/apps
2. Log in with your phone number
3. Create a new application (or use existing)
4. Copy the **API ID** (numeric) to `TELEGRAM_API_ID`
5. Copy the **API Hash** (string) to `TELEGRAM_API_HASH`
6. These are used for MTProto username resolution (works better than Bot API)

### 4. Check Interval
- Set `CHECK_INTERVAL_MINUTES` to a value between 1 and 5
- Recommended: `2` (checks every 2 minutes)
- Lower values = more frequent checks but more API calls

### 5. Cron Secret (Optional)
- Generate a random secret string
- Used to secure cron job endpoints
- Only needed if using external cron services

### 6. App URL (Optional)
- For local development: `http://localhost:3000`
- For Vercel: Your Vercel deployment URL
- Only needed for cron scheduler in development

## Example .env.local

```env
# ============================================
# REQUIRED - Supabase
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# REQUIRED - Authentication & Email
# ============================================
ADMIN_PASSWORD=MySecurePass123!
SMTP_USER=myemail@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop

# ============================================
# REQUIRED - Telegram Bot
# ============================================
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# ============================================
# REQUIRED - Telegram MTProto (for username resolution)
# ============================================
# Get from https://my.telegram.org/apps
TELEGRAM_API_ID=26481096
TELEGRAM_API_HASH=490e357d5a2d4dae14b23fa74087f17d

# ============================================
# OPTIONAL - Email Settings
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM=myemail@gmail.com

# ============================================
# OPTIONAL FALLBACKS - Can be removed after Settings page setup
# These are only used if Settings table is empty
# ============================================
TELEGRAM_SUPPORT_EMAIL=abuse@telegram.org
TELEGRAM_CHAT_ID=123456789
CHECK_INTERVAL_MINUTES=2

# ============================================
# OPTIONAL - Cron & App URL
# ============================================
CRON_SECRET=my-super-secret-key-12345
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Important Notes

**After initial setup:**
1. Go to `/settings` page and configure:
   - Support emails (can add multiple)
   - Check interval
   - Telegram chat ID
2. Once configured in Settings, you can **remove** these from `.env.local`:
   - `TELEGRAM_SUPPORT_EMAIL`
   - `TELEGRAM_CHAT_ID`
   - `CHECK_INTERVAL_MINUTES`

These values will be stored in Supabase and loaded from there instead.

## Notes

- `NODE_ENV` is automatically set by Next.js (don't set it manually)
- All sensitive values should be kept secret
- Never commit `.env.local` to version control (it's in `.gitignore`)
- For production, set these variables in your hosting platform's environment settings

