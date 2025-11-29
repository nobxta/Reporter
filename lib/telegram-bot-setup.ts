import { Telegraf } from "telegraf";

/**
 * Initialize bot with command handlers
 * This can be used for polling mode (development) or webhook setup
 */
export function setupBotCommands(botToken: string) {
  const bot = new Telegraf(botToken);

  // Handle /start command
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "✅ <b>TG Report Shield Bot is Active!</b>\n\n" +
      "This bot will send you notifications when:\n" +
      "• Reports are successfully sent\n" +
      "• Targets are detected as banned\n\n" +
      "Bot is working correctly! 🚀",
      { parse_mode: "HTML" }
    );
  });

  // Handle /status command
  bot.command("status", async (ctx) => {
    await ctx.reply(
      "🤖 <b>Bot Status</b>\n\n" +
      "✅ Bot is online and operational\n" +
      "📊 Ready to receive notifications\n" +
      `🕐 Server time: ${new Date().toLocaleString()}`,
      { parse_mode: "HTML" }
    );
  });

  // Handle any other message
  bot.on("message", async (ctx) => {
    if (!ctx.message.text?.startsWith("/")) {
      await ctx.reply(
        "👋 Hello! Available commands:\n" +
        "/start - Verify bot is working\n" +
        "/status - Check bot status"
      );
    }
  });

  return bot;
}

/**
 * Start bot in polling mode (for development)
 * In production, use webhook mode instead
 */
export async function startBotPolling(botToken: string) {
  const bot = setupBotCommands(botToken);
  
  try {
    await bot.launch();
    console.log("🤖 Telegram bot started in polling mode");
    
    // Graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (error) {
    console.error("Error starting bot:", error);
  }
}

