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

export interface ChatDetails {
  id: string | number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  membersCount?: number;
  description?: string;
  isBanned: boolean;
  error?: string;
}

/**
 * Get detailed information about a chat/user/channel
 * @param botToken Telegram bot token
 * @param target Username or channel link (e.g., @username or https://t.me/channel)
 * @returns Detailed chat information
 */
export async function getChatDetails(
  botToken: string,
  target: string
): Promise<ChatDetails> {
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
    const chatId = username.replace("@", "").trim();
    
    if (!chatId || chatId.length === 0) {
      return {
        id: target,
        type: "channel",
        isBanned: false,
        error: "Invalid username: chat_id is empty",
      };
    }
    
    // Check if target is a numeric ID (user ID)
    const isNumericId = /^-?\d+$/.test(chatId);
    
    try {
      // Get chat information
      // If it's a numeric ID, use it directly; otherwise use username
      const chat = isNumericId 
        ? await bot.telegram.getChat(parseInt(chatId))
        : await bot.telegram.getChat(chatId);
      
      // Get member count for channels/groups
      let membersCount: number | undefined;
      if (chat.type === "channel" || chat.type === "supergroup") {
        try {
          const memberCount = await bot.telegram.getChatMembersCount(chatId);
          membersCount = memberCount;
        } catch (e) {
          // Member count might not be available
        }
      }
      
      // For users, get additional info
      let firstName: string | undefined;
      let lastName: string | undefined;
      if (chat.type === "private") {
        firstName = "first_name" in chat ? chat.first_name : undefined;
        lastName = "last_name" in chat ? chat.last_name : undefined;
      }
      
      return {
        id: chat.id,
        type: chat.type as any,
        title: "title" in chat ? chat.title : undefined,
        username: "username" in chat ? chat.username : undefined,
        firstName,
        lastName,
        membersCount,
        description: "description" in chat ? chat.description : undefined,
        isBanned: false,
      };
    } catch (error: any) {
      // Check for specific error codes that indicate ban/unavailability
      const errorMessage = error?.response?.description || error?.message || "";
      
      // Common error codes:
      // 400: Bad Request (invalid username)
      // 403: Forbidden (private channel or bot not in channel)
      // 404: Not Found (banned, deleted, or doesn't exist)
      
      if (error?.response?.error_code === 404) {
        // Chat not found - likely banned or deleted
        // Try to determine if it's a user or channel based on error
        const isUser = errorMessage.toLowerCase().includes("user") || 
                      errorMessage.toLowerCase().includes("private");
        return {
          id: username.replace("@", ""),
          type: isUser ? "private" : "channel",
          username: username.replace("@", ""),
          isBanned: true,
          error: "Chat not found (likely banned or deleted)",
        };
      }
      
      if (error?.response?.error_code === 403) {
        // Forbidden - could be private or bot doesn't have access
        // For users, this usually means they haven't messaged the bot
        const isUser = errorMessage.toLowerCase().includes("user") || 
                      errorMessage.toLowerCase().includes("private");
        return {
          id: username.replace("@", ""),
          type: isUser ? "private" : "channel",
          username: username.replace("@", ""),
          isBanned: false,
          error: isUser 
            ? "User hasn't messaged the bot (required to get user info)"
            : "Forbidden (private channel or bot doesn't have access)",
        };
      }
      
      if (error?.response?.error_code === 400) {
        // Bad Request - invalid username or chat_id is empty
        if (errorMessage.toLowerCase().includes("chat_id is empty") || 
            errorMessage.toLowerCase().includes("chat not found") ||
            errorMessage.toLowerCase().includes("username not occupied")) {
          // Try to determine if it's a user or channel
          // For users, Telegram API requires they've messaged the bot
          return {
            id: username.replace("@", ""),
            type: "private", // Assume user if we can't determine
            username: username.replace("@", ""),
            isBanned: false,
            error: "Cannot access user info. User must have messaged the bot first, or username may not exist.",
          };
        }
      }
      
      // For other errors
      console.warn(`Error checking ${target}:`, errorMessage);
      return {
        id: username.replace("@", ""),
        type: "channel", // Default to channel
        username: username.replace("@", ""),
        isBanned: false,
        error: errorMessage || "Unknown error",
      };
    }
  } catch (error: any) {
    console.error("Error in getChatDetails:", error);
    return {
      id: target,
      type: "channel",
      isBanned: false,
      error: error.message || "Failed to get chat details",
    };
  }
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
): Promise<{ isBanned: boolean; error?: string; details?: ChatDetails }> {
  const details = await getChatDetails(botToken, target);
  return {
    isBanned: details.isBanned,
    error: details.error,
    details,
  };
}

