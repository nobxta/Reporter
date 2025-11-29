import { Telegraf } from "telegraf";
import { getChatDetails, checkUsernameStatus } from "@/lib/telegram-bot";

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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

  // Handle /check command - Check if target is banned
  bot.command("check", async (ctx) => {
    const args = ctx.message.text?.split(" ").slice(1);
    if (!args || args.length === 0) {
      await ctx.reply(
        "❌ Please provide a target to check.\n\n" +
        "Usage: <code>/check @username</code>\n" +
        "Or: <code>/check https://t.me/channel</code>",
        { parse_mode: "HTML" }
      );
      return;
    }

    const target = args.join(" ");
    
    try {
      await ctx.reply("🔍 Checking target...", { parse_mode: "HTML" });
      
      const result = await checkUsernameStatus(botToken, target);
      const details = result.details;

      if (result.isBanned) {
        let message = `✅ <b>Target is BANNED</b>\n\n` +
          `Target: <code>${target}</code>\n` +
          `Status: Banned or Unavailable\n`;
        
        if (details?.id) {
          message += `Chat ID: <code>${details.id}</code>\n`;
        }
        if (details?.error) {
          message += `Reason: ${details.error}\n`;
        }
        message += `Checked: ${new Date().toLocaleString()}`;
        
        await ctx.reply(message, { parse_mode: "HTML" });
      } else {
        let message = `🟢 <b>Target is ACTIVE</b>\n\n` +
          `Target: <code>${target}</code>\n` +
          `Status: Active\n`;
        
        if (details) {
          if (details.id) {
            message += `Chat ID: <code>${details.id}</code>\n`;
          }
          if (details.type) {
            message += `Type: ${details.type}\n`;
          }
          if (details.title) {
            message += `Title: ${details.title}\n`;
          }
          if (details.membersCount !== undefined) {
            message += `Members: ${details.membersCount.toLocaleString()}\n`;
          }
          if (details.username) {
            message += `Username: @${details.username}\n`;
          }
          if (details.error) {
            message += `Note: ${details.error}\n`;
          }
        }
        message += `Checked: ${new Date().toLocaleString()}`;
        
        await ctx.reply(message, { parse_mode: "HTML" });
      }
    } catch (error: any) {
      await ctx.reply(
        `❌ Error checking target: ${error.message || "Unknown error"}`,
        { parse_mode: "HTML" }
      );
    }
  });

  // Handle /info command - Get detailed info about target
  bot.command("info", async (ctx) => {
    const args = ctx.message.text?.split(" ").slice(1);
    if (!args || args.length === 0) {
      await ctx.reply(
        "❌ Please provide a target to get info.\n\n" +
        "Usage: <code>/info @username</code>\n" +
        "Or: <code>/info https://t.me/channel</code>",
        { parse_mode: "HTML" }
      );
      return;
    }

    const target = args.join(" ");
    
    try {
      await ctx.reply("🔍 Fetching information...", { parse_mode: "HTML" });
      
      const details = await getChatDetails(botToken, target);

      let message = `📋 <b>Target Information</b>\n\n` +
        `Target: <code>${target}</code>\n`;
      
      if (details.isBanned) {
        message += `Status: ❌ <b>BANNED</b>\n`;
        if (details.error) {
          message += `Reason: ${details.error}\n`;
        }
      } else {
        message += `Status: ✅ <b>ACTIVE</b>\n`;
      }

      if (details.id) {
        message += `Chat ID: <code>${details.id}</code>\n`;
      }
      if (details.type) {
        message += `Type: ${details.type}\n`;
      }
      if (details.title) {
        message += `Title: ${details.title}\n`;
      }
      if (details.username) {
        message += `Username: @${details.username}\n`;
      }
      if (details.firstName) {
        message += `First Name: ${details.firstName}\n`;
      }
      if (details.lastName) {
        message += `Last Name: ${details.lastName}\n`;
      }
      if (details.membersCount !== undefined) {
        message += `Members/Subscribers: ${details.membersCount.toLocaleString()}\n`;
      }
      if (details.description) {
        message += `\nDescription:\n${details.description}\n`;
      }
      if (details.error && !details.isBanned) {
        message += `\n⚠️ Note: ${details.error}\n`;
      }
      
      message += `\nChecked: ${new Date().toLocaleString()}`;
      
      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error: any) {
      await ctx.reply(
        `❌ Error getting info: ${error.message || "Unknown error"}`,
        { parse_mode: "HTML" }
      );
    }
  });

  // Handle /stats command - Get report statistics
  bot.command("stats", async (ctx) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/bot/stats`);
      const data = await response.json();

      if (!data.success) {
        await ctx.reply("❌ Failed to fetch statistics", { parse_mode: "HTML" });
        return;
      }

      const { stats } = data;
      
      let message = `📊 <b>Report Statistics</b>\n\n` +
        `Total Reports: ${stats.total}\n` +
        `✅ Sent: ${stats.sent}\n` +
        `🎯 Banned: ${stats.banned}\n` +
        `⏳ Pending: ${stats.pending}\n\n` +
        `Success Rate: ${stats.successRate}%\n\n` +
        `📈 Last 24h:\n` +
        `• Reports: ${stats.last24h.reports}\n` +
        `• Sent: ${stats.last24h.sent}\n` +
        `• Banned: ${stats.last24h.banned}`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error: any) {
      await ctx.reply(
        `❌ Error fetching stats: ${error.message || "Unknown error"}`,
        { parse_mode: "HTML" }
      );
    }
  });

  // Handle any other message
  bot.on("message", async (ctx) => {
    if ("text" in ctx.message && ctx.message.text && !ctx.message.text.startsWith("/")) {
      await ctx.reply(
        "👋 Hello! Available commands:\n" +
        "/start - Verify bot is working\n" +
        "/status - Check bot status\n" +
        "/check @username - Check if target is banned\n" +
        "/info @username - Get detailed info about target\n" +
        "/stats - View report statistics",
        { parse_mode: "HTML" }
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

