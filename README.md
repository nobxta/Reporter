# TG Report Shield

A private Telegram reporting tool to collect and organize scam/illegal channel reports before reporting them to Telegram.

## Features

- Password-protected admin access
- Multi-step reporting flow with guided steps
- Automatic complaint generation (subject and body)
- Email sending to Telegram support
- Report history with status tracking (pending/sent/banned)
- **Automatic status checks** - Bot checks if reported usernames/channels are banned every 1-5 minutes (configurable)
- Telegram bot notifications when channels are banned or taken down
- Manual "Check Now" button for immediate status checks
- Clean, modern UI with dark mode support

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Nodemailer (email sending)
- Telegraf (Telegram bot)
- Server-side authentication with HTTP-only cookies

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory:
```env
ADMIN_PASSWORD=your-strong-password-here

# Email Configuration (for sending reports to Telegram)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
TELEGRAM_SUPPORT_EMAIL=abuse@telegram.org

# Telegram Bot Configuration (for notifications)
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_CHAT_ID=your-chat-id-here

# Cron Job Configuration
CHECK_INTERVAL_MINUTES=2
CRON_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── login/route.ts      # Login endpoint
│   │   ├── logout/route.ts     # Logout endpoint
│   │   ├── report/route.ts     # Create report endpoint
│   │   ├── reports/route.ts    # List reports endpoint
│   │   ├── send-report/route.ts # Send email endpoint
│   │   ├── check-reports/route.ts # Status check endpoint (configurable interval)
│   │   └── check-reports-manual/route.ts # Manual check trigger
│   ├── history/
│   │   └── page.tsx            # Report history page
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── report/
│   │   └── page.tsx            # Multi-step report creation
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page
│   └── globals.css             # Global styles
├── components/                 # Reusable UI components
├── lib/
│   ├── storage.ts              # In-memory report storage
│   ├── complaint-generator.ts  # Generate complaint text
│   ├── email.ts                # Email sending utilities
│   └── telegram-bot.ts         # Telegram bot utilities
├── middleware.ts               # Auth middleware
└── package.json
```

## Usage

### Reporting Flow

1. Visit the landing page to learn about the tool
2. Click "Login" and enter your admin password
3. Create reports using the multi-step form:
   - **Step 1:** Enter target username or channel link
   - **Step 2:** Select violation type
   - **Step 3:** Describe what they're doing
   - **Step 4:** Add evidence (optional) and notes (optional)
   - **Step 5:** Review generated complaint and send email
4. View report history by clicking the "History" button
5. Mark reports as "Banned" when Telegram takes action (sends notification to your bot)

### Email Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `SMTP_PASSWORD`

### Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Get your chat ID (you can use [@userinfobot](https://t.me/userinfobot) or send a message to your bot and check the chat ID)
4. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to your `.env.local`

### Automatic Status Checks

The bot automatically checks if reported usernames/channels are banned at configurable intervals (1-5 minutes):

- **Check Interval**: Set `CHECK_INTERVAL_MINUTES` in `.env.local` (default: 2 minutes, range: 1-5 minutes)
- **External Cron Service**: Use cron-job.org or similar service to call `/api/check-reports` (see `CRON_SETUP.md` for setup)
- **Manual Check**: Click "Check Now" button in History page
- **API Endpoint**: Call `/api/check-reports` with `Authorization: Bearer <CRON_SECRET>` header

**Example Configuration:**
```env
CHECK_INTERVAL_MINUTES=3  # Check every 3 minutes (1-5 minutes allowed)
```

When a target is detected as banned or unavailable, you'll receive a Telegram notification: "✅ Target Taken Down!"

## Notes

- Reports are stored in-memory and will reset when the server restarts
- For production use, consider implementing a proper database
- The admin password is stored in environment variables for security
- Email sending requires proper SMTP configuration
- Telegram bot notifications are sent when you mark a report as "banned"

