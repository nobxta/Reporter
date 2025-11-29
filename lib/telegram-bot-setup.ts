import { Telegraf } from "telegraf";
import { getChatDetails, checkUsernameStatus } from "@/lib/telegram-bot";
import { getReports } from "@/lib/storage-supabase";

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
    if (!args || args.length === 0 || !args[0] || args[0].trim() === "" || args[0] === "@") {
      await ctx.reply(
        "❌ Please provide a target to check.\n\n" +
        "Usage: <code>/check @username</code>\n" +
        "Or: <code>/check https://t.me/channel</code>",
        { parse_mode: "HTML" }
      );
      return;
    }

    const target = args.join(" ").trim();
    if (!target || target === "@" || target.length < 2) {
      await ctx.reply(
        "❌ Invalid target. Please provide a valid username or link.",
        { parse_mode: "HTML" }
      );
      return;
    }
    
    try {
      await ctx.reply("🔍 Checking target...", { parse_mode: "HTML" });
      
      const result = await checkUsernameStatus(botToken, target);
      const details = result.details;

      if (result.isBanned) {
        let message = `✅ <b>Target is BANNED</b>\n\n` +
          `Target: <code>${target}</code>\n` +
          `Status: Banned or Unavailable\n`;
        
        if (details?.id && typeof details.id !== "string") {
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
          // Only show Chat ID if it's a numeric ID (not username)
          if (details.id && (typeof details.id === "number" || (typeof details.id === "string" && /^-?\d+$/.test(details.id)))) {
            message += `Chat ID: <code>${details.id}</code>\n`;
          }
          if (details.type) {
            message += `Type: ${details.type}\n`;
          }
          if (details.title) {
            message += `Title: ${details.title}\n`;
          }
          if (details.membersCount !== undefined) {
            message += `Members/Subscribers: ${details.membersCount.toLocaleString()}\n`;
          }
          if (details.username) {
            message += `Username: @${details.username}\n`;
          }
          if (details.error && !details.error.includes("chat not found") && !details.error.includes("chat_id is empty")) {
            message += `⚠️ Note: ${details.error}\n`;
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
    if (!args || args.length === 0 || !args[0] || args[0].trim() === "" || args[0] === "@") {
      await ctx.reply(
        "❌ Please provide a target to get info.\n\n" +
        "Usage: <code>/info @username</code>\n" +
        "Or: <code>/info https://t.me/channel</code>",
        { parse_mode: "HTML" }
      );
      return;
    }

    const target = args.join(" ").trim();
    if (!target || target === "@" || target.length < 2) {
      await ctx.reply(
        "❌ Invalid target. Please provide a valid username or link.",
        { parse_mode: "HTML" }
      );
      return;
    }
    
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

      // Only show Chat ID if it's a numeric ID (not username)
      if (details.id && (typeof details.id === "number" || (typeof details.id === "string" && /^-?\d+$/.test(details.id)))) {
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
      
      // Handle errors
      if (details.error) {
        if (details.isBanned) {
          message += `\nReason: ${details.error}\n`;
        } else if (details.error.includes("chat not found") || details.error.includes("chat_id is empty")) {
          message += `\n⚠️ Note: Cannot access this chat. It may be:\n` +
            `• Private channel/group\n` +
            `• Bot doesn't have access\n` +
            `• Invalid username\n`;
        } else {
          message += `\n⚠️ Note: ${details.error}\n`;
        }
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
      // Get stats directly from database instead of API call
      const reports = await getReports();

      const total = reports.length;
      const sent = reports.filter((r) => r.status === "sent").length;
      const banned = reports.filter((r) => r.status === "banned").length;
      const pending = reports.filter((r) => r.status === "pending").length;

      // Calculate success rate (banned / sent)
      const successRate = sent > 0 ? Math.round((banned / sent) * 100) : 0;

      // Get last 24h reports
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentReports = reports.filter(
        (r) => new Date(r.createdAt) > last24h
      );
      const recentSent = recentReports.filter((r) => r.status === "sent").length;
      const recentBanned = recentReports.filter((r) => r.status === "banned").length;
      
      let message = `📊 <b>Report Statistics</b>\n\n` +
        `Total Reports: ${total}\n` +
        `✅ Sent: ${sent}\n` +
        `🎯 Banned: ${banned}\n` +
        `⏳ Pending: ${pending}\n\n` +
        `Success Rate: ${successRate}%\n\n` +
        `📈 Last 24h:\n` +
        `• Reports: ${recentReports.length}\n` +
        `• Sent: ${recentSent}\n` +
        `• Banned: ${recentBanned}`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error: any) {
      console.error("Error in /stats command:", error);
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

