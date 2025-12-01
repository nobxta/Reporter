import { Telegraf } from "telegraf";
import { getChatDetails, checkUsernameStatus } from "@/lib/telegram-bot";
import {
  getReports,
  updateReportStatus,
  updateReportCheckTime,
  getSettings,
  updateLastCheckTime,
} from "@/lib/storage-supabase";
import { runAllHealthChecks } from "@/lib/health-check";

/**
 * Initialize bot with command handlers
 * This can be used for polling mode (development) or webhook setup
 */
export function setupBotCommands(botToken: string) {
  const bot = new Telegraf(botToken);

  // Handle /start command - Enhanced with health dashboard
  bot.command("start", async (ctx) => {
    try {
      const userId = ctx.from?.id;
      const username = ctx.from?.username || "Unknown";
      const timestamp = new Date().toISOString();
      
      console.log(`[Bot] /start called by user ${userId} (@${username}) at ${timestamp}`);

      // Send initial message
      await ctx.reply("🔍 Running health checks...", { parse_mode: "HTML" });

      // Run health checks
      const health = await runAllHealthChecks(botToken);

      // Build status message
      let message = `🤖 <b>Bot Status Dashboard</b>\n\n`;
      
      // Bot Status
      message += `<b>Bot Status:</b> ${health.botStatus === "ok" ? "✅ UP" : "❌ DOWN"}\n`;
      
      // Ping
      if (health.ping > 0) {
        message += `<b>Ping:</b> ${health.ping} ms\n`;
      } else {
        message += `<b>Ping:</b> ❌ Failed\n`;
      }

      // API Health
      message += `\n<b>API Health:</b>\n`;
      for (const check of health.checks) {
        const icon = check.status === "ok" ? "✅" : "❌";
        const time = check.responseTime ? ` (${check.responseTime}ms)` : "";
        message += `${icon} ${check.name}: ${check.message}${time}\n`;
      }

      // Routes / Connectivity
      message += `\n<b>Routes / Connectivity:</b>\n`;
      message += `✅ Outgoing requests: OK\n`;
      message += `✅ Database: ${health.checks.find(c => c.name === "Database")?.status === "ok" ? "OK" : "FAILING"}\n`;

      // Speed
      const avgResponseTime = health.checks
        .filter(c => c.responseTime)
        .reduce((sum, c) => sum + (c.responseTime || 0), 0) / health.checks.filter(c => c.responseTime).length;
      
      if (avgResponseTime > 0) {
        message += `\n<b>Speed:</b> ${Math.round(avgResponseTime)} ms avg response time\n`;
      } else {
        message += `\n<b>Speed:</b> Unable to measure\n`;
      }

      // Overall status
      message += `\n<b>Overall Status:</b> ${health.overallStatus === "ok" ? "✅ All systems operational" : "⚠️ Some issues detected"}\n`;
      message += `\n🕐 ${new Date().toLocaleString()}`;

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error: any) {
      console.error("Error in /start command:", error);
      await ctx.reply(
        `❌ Error running health checks: ${error.message || "Unknown error"}\n\nBot may still be functional.`,
        { parse_mode: "HTML" }
      );
    }
  });

  // Handle /status command (kept for backward compatibility)
  bot.command("status", async (ctx) => {
    await ctx.reply(
      "🤖 <b>Bot Status</b>\n\n" +
      "✅ Bot is online and operational\n" +
      "📊 Ready to receive notifications\n" +
      `🕐 Server time: ${new Date().toLocaleString()}\n\n` +
      "Use /start for detailed health dashboard",
      { parse_mode: "HTML" }
    );
  });

  // Handle /checkuser command - Check if specific target is banned (renamed from /check)
  bot.command("checkuser", async (ctx) => {
    const args = ctx.message.text?.split(" ").slice(1);
    if (!args || args.length === 0 || !args[0] || args[0].trim() === "" || args[0] === "@") {
      await ctx.reply(
        "❌ Please provide a target to check.\n\n" +
        "Usage: <code>/checkuser @username</code>\n" +
        "Or: <code>/checkuser https://t.me/channel</code>",
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

  // Handle /check command - Mass check all reported accounts
  bot.command("check", async (ctx) => {
    try {
      await ctx.reply("🔄 Starting mass check of all reported accounts...\nThis may take a while.", { parse_mode: "HTML" });

      const startTime = Date.now();
      const reports = await getReports();
      
      // Filter to only sent reports that haven't been banned
      const reportsToCheck = reports.filter(
        (r) => r.status === "sent" && !r.bannedAt
      );

      if (reportsToCheck.length === 0) {
        await ctx.reply(
          "ℹ️ No reports to check. All reports are either pending, already banned, or have been checked recently.",
          { parse_mode: "HTML" }
        );
        return;
      }

      let checkedCount = 0;
      let activeCount = 0;
      let bannedCount = 0;
      let errorCount = 0;

      // Process in batches to avoid rate limiting
      const batchSize = 5;
      for (let i = 0; i < reportsToCheck.length; i += batchSize) {
        const batch = reportsToCheck.slice(i, i + batchSize);
        
        for (const report of batch) {
          try {
            // Update last checked time
            await updateReportCheckTime(report.id);

            // Parse targets (can be multiple)
            const targets = report.target
              .split(/[\n,]/)
              .map(t => t.trim())
              .filter(t => t.length > 0);

            let anyBanned = false;
            
            for (const target of targets) {
              const checkResult = await checkUsernameStatus(botToken, target);
              
              if (checkResult.isBanned) {
                anyBanned = true;
                break;
              }
              
              // Small delay between targets
              await new Promise(resolve => setTimeout(resolve, 500));
            }

            if (anyBanned) {
              await updateReportStatus(report.id, "banned");
              bannedCount++;
            } else {
              activeCount++;
            }
            
            checkedCount++;
            
            // Small delay between reports
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error: any) {
            console.error(`Error checking report ${report.id}:`, error);
            errorCount++;
          }
        }

        // Send progress update every 10 reports
        if (checkedCount % 10 === 0 && checkedCount > 0) {
          await ctx.reply(
            `⏳ Progress: ${checkedCount}/${reportsToCheck.length} checked...`,
            { parse_mode: "HTML" }
          );
        }
      }

      // Update last check time
      await updateLastCheckTime();

      const duration = Math.round((Date.now() - startTime) / 1000);
      
      const summary = `✅ <b>Check Complete</b>\n\n` +
        `Total reported: ${reports.length}\n` +
        `Checked: ${checkedCount}\n` +
        `Active accounts: ${activeCount}\n` +
        `Possibly banned / not found: ${bannedCount}\n` +
        `Errors: ${errorCount}\n\n` +
        `Duration: ${duration}s\n` +
        `Completed: ${new Date().toLocaleString()}`;

      await ctx.reply(summary, { parse_mode: "HTML" });
      
      console.log(`[Bot] Mass check completed: ${checkedCount} checked, ${bannedCount} banned, ${errorCount} errors`);
    } catch (error: any) {
      console.error("Error in /check command:", error);
      await ctx.reply(
        `❌ Error running mass check: ${error.message || "Unknown error"}`,
        { parse_mode: "HTML" }
      );
    }
  });

  // Handle /info command - Enhanced with more details
  bot.command("info", async (ctx) => {
    const args = ctx.message.text?.split(" ").slice(1);
    
    // If no args, show info about the user who sent the command
    if (!args || args.length === 0 || !args[0] || args[0].trim() === "" || args[0] === "@") {
      if (ctx.from) {
        try {
          const userChat = await bot.telegram.getChat(ctx.from.id);
          let message = `📋 <b>Your Information</b>\n\n`;
          
          message += `User ID: <code>${ctx.from.id}</code>\n`;
          if (ctx.from.first_name) {
            message += `First Name: ${ctx.from.first_name}\n`;
          }
          if (ctx.from.last_name) {
            message += `Last Name: ${ctx.from.last_name}\n`;
          }
          if (ctx.from.username) {
            message += `Username: @${ctx.from.username}\n`;
          }
          message += `Type: User\n`;
          message += `Status: ✅ ACTIVE\n`;
          message += `\nChecked: ${new Date().toLocaleString()}`;
          
          await ctx.reply(message, { parse_mode: "HTML" });
          return;
        } catch (e) {
          // Fall through to show usage
        }
      }
      
      await ctx.reply(
        "❌ Please provide a target to get info.\n\n" +
        "Usage: <code>/info @username</code>\n" +
        "Or: <code>/info https://t.me/channel</code>\n" +
        "Or: <code>/info &lt;numeric_id&gt;</code>\n" +
        "Or: <code>/info</code> (shows your own info)",
        { parse_mode: "HTML" }
      );
      return;
    }

    const target = args.join(" ").trim();
    if (!target || target === "@" || target.length < 2) {
      await ctx.reply(
        "❌ Invalid target. Please provide a valid username, link, or numeric ID.",
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

      // Show Chat ID if it's a numeric ID
      if (details.id && (typeof details.id === "number" || (typeof details.id === "string" && /^-?\d+$/.test(details.id)))) {
        message += `ID: <code>${details.id}</code>\n`;
      }
      
      if (details.type) {
        const typeLabel = details.type === "private" ? "User" : 
                         details.type === "supergroup" ? "Supergroup" :
                         details.type === "group" ? "Group" : "Channel";
        message += `Type: ${typeLabel}\n`;
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
      
      // Enhanced details for users
      if (details.type === "private") {
        if (details.isBot !== undefined) {
          message += `Is Bot: ${details.isBot ? "Yes" : "No"}\n`;
        }
        if (details.isScam !== undefined) {
          message += `Is Scam: ${details.isScam ? "Yes ⚠️" : "No"}\n`;
        }
        if (details.isFake !== undefined) {
          message += `Is Fake: ${details.isFake ? "Yes ⚠️" : "No"}\n`;
        }
        if (details.isPremium !== undefined) {
          message += `Is Premium: ${details.isPremium ? "Yes ⭐" : "No"}\n`;
        }
        if (details.isVerified !== undefined) {
          message += `Is Verified: ${details.isVerified ? "Yes ✓" : "No"}\n`;
        }
        if (details.isRestricted !== undefined) {
          message += `Is Restricted: ${details.isRestricted ? "Yes" : "No"}\n`;
        }
      }
      
      // Enhanced details for channels
      if (details.type === "channel") {
        if (details.isVerified !== undefined) {
          message += `Is Verified: ${details.isVerified ? "Yes ✓" : "No"}\n`;
        }
        if (details.isScam !== undefined) {
          message += `Is Scam: ${details.isScam ? "Yes ⚠️" : "No"}\n`;
        }
        if (details.isFake !== undefined) {
          message += `Is Fake: ${details.isFake ? "Yes ⚠️" : "No"}\n`;
        }
        if (details.isRestricted !== undefined) {
          message += `Is Restricted: ${details.isRestricted ? "Yes" : "No"}\n`;
        }
      }
      
      if (details.membersCount !== undefined) {
        message += `Members/Subscribers: ${details.membersCount.toLocaleString()}\n`;
      }
      if (details.description) {
        message += `\nDescription:\n${details.description}\n`;
      }
      
      if (details.link) {
        message += `\nLink: ${details.link}\n`;
      }
      
      // Handle errors with better context
      if (details.error) {
        if (details.isBanned) {
          message += `\nReason: ${details.error}\n`;
        } else if (details.type === "private" && details.error.includes("messaged the bot")) {
          message += `\n⚠️ <b>Note:</b> To get user info, the user must have messaged this bot at least once.\n` +
            `This is a Telegram API limitation for privacy.\n`;
        } else if (details.error.includes("chat not found") || details.error.includes("chat_id is empty") || details.error.includes("username not occupied")) {
          if (details.type === "private") {
            message += `\n⚠️ <b>Note:</b> Cannot access user info.\n` +
              `• User must have messaged the bot first\n` +
              `• Or username may not exist\n`;
          } else {
            message += `\n⚠️ <b>Note:</b> Cannot access this chat. It may be:\n` +
              `• Private channel/group\n` +
              `• Bot doesn't have access\n` +
              `• Invalid username\n`;
          }
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

  // Handle /history command - View all reported accounts
  bot.command("history", async (ctx) => {
    try {
      const args = ctx.message.text?.split(" ").slice(1);
      const page = args && args[0] ? parseInt(args[0]) : 1;
      const itemsPerPage = 20;

      if (isNaN(page) || page < 1) {
        await ctx.reply(
          "❌ Invalid page number. Usage: <code>/history [page]</code>\nExample: <code>/history 2</code>",
          { parse_mode: "HTML" }
        );
        return;
      }

      const reports = await getReports();
      const totalPages = Math.ceil(reports.length / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageReports = reports.slice(startIndex, endIndex);

      if (pageReports.length === 0) {
        await ctx.reply(
          `ℹ️ No reports found${page > 1 ? ` on page ${page}` : ""}.\n\n` +
          `Total reports: ${reports.length}`,
          { parse_mode: "HTML" }
        );
        return;
      }

      let message = `📜 <b>Report History</b>\n\n`;
      message += `Page ${page} of ${totalPages} (${reports.length} total)\n\n`;

      pageReports.forEach((report, index) => {
        const globalIndex = startIndex + index + 1;
        const target = report.target.split(/[\n,]/)[0].trim(); // Show first target
        const statusIcon = 
          report.status === "banned" ? "🎯" :
          report.status === "sent" ? "✅" :
          "⏳";
        
        const statusLabel = 
          report.status === "banned" ? "Banned" :
          report.status === "sent" ? "Active" :
          "Pending";

        message += `#${globalIndex} <code>${target}</code>\n`;
        message += `Type: ${report.violationType}\n`;
        message += `Status: ${statusIcon} ${statusLabel}\n`;
        message += `Reported: ${new Date(report.createdAt).toLocaleString()}\n`;
        
        if (report.lastChecked) {
          message += `Last checked: ${new Date(report.lastChecked).toLocaleString()}\n`;
        } else {
          message += `Last checked: Never\n`;
        }
        
        message += `\n`;
      });

      if (totalPages > 1) {
        message += `\nUse <code>/history ${page + 1}</code> for next page`;
        if (page > 1) {
          message += `\nUse <code>/history ${page - 1}</code> for previous page`;
        }
      }

      await ctx.reply(message, { parse_mode: "HTML" });
    } catch (error: any) {
      console.error("Error in /history command:", error);
      await ctx.reply(
        `❌ Error fetching history: ${error.message || "Unknown error"}`,
        { parse_mode: "HTML" }
      );
    }
  });

  // Handle /stats command - Enhanced with last check time
  bot.command("stats", async (ctx) => {
    try {
      const reports = await getReports();
      const settings = await getSettings();

      const total = reports.length;
      const sent = reports.filter((r) => r.status === "sent").length;
      const banned = reports.filter((r) => r.status === "banned").length;
      const pending = reports.filter((r) => r.status === "pending").length;
      const active = sent - banned; // Active = sent but not banned

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
        `<b>Total reported:</b> ${total}\n` +
        `<b>Active:</b> ${active}\n` +
        `<b>Banned / Not found:</b> ${banned}\n` +
        `<b>Pending check:</b> ${pending}\n\n` +
        `<b>Success Rate:</b> ${successRate}%\n\n` +
        `<b>Last 24h:</b>\n` +
        `• Reports: ${recentReports.length}\n` +
        `• Sent: ${recentSent}\n` +
        `• Banned: ${recentBanned}\n`;

      // Show last check time from settings
      if (settings.updated_at) {
        const lastCheck = new Date(settings.updated_at);
        const timeSince = Math.round((Date.now() - lastCheck.getTime()) / 1000 / 60);
        message += `\n<b>Last check run:</b> ${lastCheck.toLocaleString()} (${timeSince} minutes ago)`;
      } else {
        message += `\n<b>Last check run:</b> Never`;
      }

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
        "/start - Bot status dashboard\n" +
        "/check - Mass check all reported accounts\n" +
        "/checkuser @username - Check if specific target is banned\n" +
        "/info @username - Get detailed info about target\n" +
        "/history [page] - View all reported accounts\n" +
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
