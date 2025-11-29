import { Telegraf } from "telegraf";

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

export function formatAutoBanNotification(target: string, reportId: string): string {
  return `✅ <b>Target Taken Down!</b>\n\n` +
    `Target: <code>${target}</code>\n` +
    `Report ID: ${reportId}\n` +
    `Status: Banned or Unavailable\n` +
    `Detected: ${new Date().toLocaleString()}`;
}

/**
 * Check if a username/channel is banned or unavailable
 * @param botToken Telegram bot token
 * @param target Username or channel link (e.g., @username or https://t.me/channel)
 * @returns Object with isBanned status and error message if any
 */
export async function checkUsernameStatus(
  botToken: string,
  target: string
): Promise<{ isBanned: boolean; error?: string }> {
  try {
    const bot = initializeBot(botToken, "");
    
    // Extract username from target (handle @username or https://t.me/username)
    let username = target.trim();
    if (username.startsWith("https://t.me/")) {
      username = "@" + username.replace("https://t.me/", "").split("/")[0];
    } else if (!username.startsWith("@")) {
      username = "@" + username;
    }
    
    // Remove @ for getChat
    const chatId = username.replace("@", "");
    
    try {
      // Try to get chat information
      await bot.telegram.getChat(chatId);
      // If successful, the chat exists and is accessible
      return { isBanned: false };
    } catch (error: any) {
      // Check for specific error codes that indicate ban/unavailability
      const errorMessage = error?.response?.description || error?.message || "";
      
      // Common error codes:
      // 400: Bad Request (invalid username)
      // 403: Forbidden (private channel or bot not in channel)
      // 404: Not Found (banned, deleted, or doesn't exist)
      
      if (error?.response?.error_code === 404) {
        // Chat not found - likely banned or deleted
        return { isBanned: true, error: "Chat not found (likely banned or deleted)" };
      }
      
      if (error?.response?.error_code === 403) {
        // Forbidden - could be private or bot doesn't have access
        // We'll treat this as "not banned" since we can't be sure
        return { isBanned: false, error: "Forbidden (private or no access)" };
      }
      
      // For other errors, we'll assume it's still active
      // but log the error for debugging
      console.warn(`Error checking ${target}:`, errorMessage);
      return { isBanned: false, error: errorMessage };
    }
  } catch (error: any) {
    console.error("Error in checkUsernameStatus:", error);
    return {
      isBanned: false,
      error: error.message || "Failed to check username status",
    };
  }
}

