# Telegram Bot Setup Guide

## Overview

The Telegram bot responds to `/start` command to confirm it's working and sends notifications when:
- Reports are successfully sent
- Targets are detected as banned

## Setup Options

### Option 1: Webhook Mode (Recommended for Production)

1. **Get your webhook URL:**
   - Production: `https://yourdomain.com/api/telegram-webhook`
   - Development: Use a tunnel service like `ngrok` or `cloudflared`

2. **Set webhook via Telegram API:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://yourdomain.com/api/telegram-webhook"}'
   ```

3. **Verify webhook is set:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

4. **Test the bot:**
   - Send `/start` to your bot
   - You should receive: "✅ TG Report Shield Bot is Active!"

### Option 2: Polling Mode (For Local Development)

For local development, you can use polling mode:

1. **Create a development script** (`scripts/bot-dev.ts` or use Node.js directly):

```typescript
import { startBotPolling } from "../lib/telegram-bot-setup";

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error("TELEGRAM_BOT_TOKEN not set");
  process.exit(1);
}

startBotPolling(botToken);
```

2. **Run in a separate terminal:**
   ```bash
   npx tsx scripts/bot-dev.ts
   # or
   node -r ts-node/register scripts/bot-dev.ts
   ```

3. **Test the bot:**
   - Send `/start` to your bot
   - You should receive: "✅ TG Report Shield Bot is Active!"

### Option 3: Using ngrok for Local Development (Webhook)

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   # or download from https://ngrok.com/
   ```

2. **Start your Next.js dev server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

5. **Set webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://abc123.ngrok.io/api/telegram-webhook"}'
   ```

6. **Test the bot:**
   - Send `/start` to your bot

## Available Commands

- `/start` - Verify bot is working
- `/status` - Check bot status and server time

## Environment Variables

Make sure these are set in `.env.local`:

```env
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_CHAT_ID=your-chat-id-here
```

## Troubleshooting

### Bot doesn't respond to /start

1. **Check webhook is set:**
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

2. **Check webhook URL is accessible:**
   - Visit `https://yourdomain.com/api/telegram-webhook` (should return JSON)

3. **Check server logs** for errors

4. **Verify bot token** is correct

### Webhook errors

- Make sure your webhook URL uses HTTPS (required by Telegram)
- Check that the endpoint returns `{ ok: true }` for valid requests
- Verify CORS if using a custom domain

## Production Deployment

When deploying to Vercel or similar:

1. Set webhook URL to: `https://yourdomain.com/api/telegram-webhook`
2. Ensure `TELEGRAM_BOT_TOKEN` is set in environment variables
3. Test with `/start` command

## Notes

- The bot only responds to commands when webhook is set up OR polling is active
- Notifications (ban alerts) work independently of command handlers
- Webhook mode is recommended for production as it's more efficient

