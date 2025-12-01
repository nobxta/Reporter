import { Telegraf } from "telegraf";
import {
  getMTProtoChatDetails,
  checkMTProtoUsernameStatus,
  type MTProtoChatDetails,
} from "./telegram-mtproto";

let botInstance: Telegraf | null = null;

export function initializeBot(token: string, chatId: string) {
  if (botInstance) {
    return botInstance;
  }

  const bot = new Telegraf(token);
  
  // Store chatId for notifications
  (bot as any).chatId = chatId;
  
  botInstance = bot;
  return bot;
}

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const bot = initializeBot(botToken, chatId);
    await bot.telegram.sendMessage(chatId, message, { parse_mode: "HTML" });
    return { success: true };
  } catch (error: any) {
    console.error("Telegram notification error:", error);
    return {
      success: false,
      error: error.message || "Failed to send Telegram notification",
    };
  }
}

export function formatBanNotification(target: string, reportId: string): string {
  return `🎉 <b>Channel Banned Successfully!</b>\n\n` +
    `Target: <code>${target}</code>\n` +
    `Report ID: ${reportId}\n` +
    `Time: ${new Date().toLocaleString()}`;
}

export function formatAutoBanNotification(
  target: string,
  reportId: string,
  details?: ChatDetails
): string {
  let message = `✅ <b>Target Taken Down!</b>\n\n` +
    `Target: <code>${target}</code>\n` +
    `Report ID: ${reportId}\n` +
    `Status: Banned or Unavailable\n`;
  
  if (details) {
    if (details.id) {
      message += `Chat ID: <code>${details.id}</code>\n`;
    }
    if (details.type) {
      message += `Type: ${details.type}\n`;
    }
  }
  
  message += `Detected: ${new Date().toLocaleString()}`;
  return message;
}

export function formatNewReportNotification(
  target: string,
  reportId: string,
  violationType: string
): string {
  // Extract username from target (handle @username or https://t.me/username)
  let username = target.trim();
  if (username.startsWith("https://t.me/")) {
    username = username.replace("https://t.me/", "").split("/")[0];
    if (!username.startsWith("@")) {
      username = "@" + username;
    }
  } else if (!username.startsWith("@")) {
    username = "@" + username;
  }

  return `📝 <b>New Report Submitted</b>\n\n` +
    `Target: <code>${username}</code>\n` +
    `Violation: ${violationType}\n` +
    `Report ID: <code>${reportId}</code>\n` +
    `Time: ${new Date().toLocaleString()}`;
}

// Re-export MTProto types for backward compatibility
export type ChatDetails = MTProtoChatDetails;

/**
 * Get detailed information about a chat/user/channel
 * Uses MTProto (GramJS) for better username resolution
 * @param botToken Telegram bot token (kept for API compatibility, but not used)
 * @param target Username or channel link (e.g., @username or https://t.me/channel)
 * @returns Detailed chat information
 */
export async function getChatDetails(
  botToken: string,
  target: string
): Promise<ChatDetails> {
  // Use MTProto for username resolution (works better than Bot API)
  try {
    return await getMTProtoChatDetails(target);
  } catch (error: any) {
    console.error("Error in getChatDetails (MTProto):", error);
    const errorMessage = error?.message || "Failed to get chat details";
    const isFloodWait = errorMessage.includes("FLOOD_WAIT");
    
    // Fallback: return error response with unknown status
    return {
      id: target,
      type: "channel",
      isBanned: false,
      status: isFloodWait ? "unknown" : "unknown",
      error: errorMessage,
    };
  }
}

/**
 * Check if a username/channel is banned or unavailable
 * Uses MTProto (GramJS) for better username resolution
 * @param botToken Telegram bot token (kept for API compatibility, but not used)
 * @param target Username or channel link (e.g., @username or https://t.me/channel)
 * @returns Object with status classification and error message if any
 */
export async function checkUsernameStatus(
  botToken: string,
  target: string
): Promise<{ 
  isBanned: boolean; // Deprecated: use status instead
  status: "active" | "banned" | "unknown";
  error?: string;
  errorCode?: string;
  retryAfterSeconds?: number;
  details?: ChatDetails 
}> {
  // Use MTProto for username checking (works better than Bot API)
  try {
    return await checkMTProtoUsernameStatus(target);
  } catch (error: any) {
    console.error("Error in checkUsernameStatus (MTProto):", error);
    const errorMessage = error?.message || "Failed to check username status";
    const isFloodWait = errorMessage.includes("FLOOD_WAIT");
    
    // Fallback: return error response with unknown status
    return {
      isBanned: false,
      status: isFloodWait ? "unknown" : "unknown",
      error: errorMessage,
      details: {
        id: target,
        type: "channel",
        isBanned: false,
        status: isFloodWait ? "unknown" : "unknown",
        error: errorMessage,
      },
    };
  }
}

