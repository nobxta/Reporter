import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";

// Reusable client instance (for serverless, we'll create new instances per request)
let clientInstance: TelegramClient | null = null;
let isConnecting = false;
let connectionPromise: Promise<TelegramClient> | null = null;

export interface MTProtoChatDetails {
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
 * Get or create a GramJS client instance
 * For serverless environments, we create a new client per request
 * For long-running processes, we reuse the same client
 */
async function getMTProtoClient(): Promise<TelegramClient> {
  const API_ID = parseInt(process.env.TELEGRAM_API_ID || "");
  const API_HASH = process.env.TELEGRAM_API_HASH || "";
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

  if (!API_ID || !API_HASH || !BOT_TOKEN) {
    throw new Error(
      "TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_BOT_TOKEN must be set in environment variables"
    );
  }

  // For serverless (Vercel), always create a new client
  // For long-running processes, reuse the client
  const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (!isServerless && clientInstance && clientInstance.connected) {
    return clientInstance;
  }

  // If already connecting, wait for that promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Create new client
  const session = new StringSession("");
  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
  });

  isConnecting = true;
  connectionPromise = (async () => {
    try {
      await client.start({
        botAuthToken: BOT_TOKEN,
      });

      if (!isServerless) {
        clientInstance = client;
      }

      isConnecting = false;
      connectionPromise = null;
      return client;
    } catch (error) {
      isConnecting = false;
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
}

/**
 * Get detailed information about a chat/user/channel using MTProto
 * This can resolve usernames that Telegraf cannot access
 */
export async function getMTProtoChatDetails(
  target: string
): Promise<MTProtoChatDetails> {
  let client: TelegramClient | null = null;

  try {
    client = await getMTProtoClient();

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

    // Remove @ for getEntity
    const entityId = username.replace("@", "").trim();

    if (!entityId || entityId.length === 0) {
      return {
        id: target,
        type: "channel",
        isBanned: false,
        error: "Invalid username: username is empty",
      };
    }

    // Check if it's a numeric ID
    const isNumericId = /^-?\d+$/.test(entityId);

    try {
      // Get entity using MTProto (works for public users/channels)
      const entity = isNumericId
        ? await client.getEntity(parseInt(entityId))
        : await client.getEntity(entityId);

      // Handle User
      if (entity instanceof Api.User) {
        return {
          id: entity.id.toString(),
          type: "private",
          firstName: entity.firstName || undefined,
          lastName: entity.lastName || undefined,
          username: entity.username || undefined,
          isBanned: entity.deleted || false,
          description: undefined,
        };
      }

      // Handle Channel
      if (entity instanceof Api.Channel) {
        let membersCount: number | undefined;
        try {
          // Try to get member count (might fail for private channels)
          const fullChannel = await client.getEntity(entity.id);
          if (fullChannel instanceof Api.Channel && fullChannel.participantsCount) {
            membersCount = fullChannel.participantsCount;
          }
        } catch (e) {
          // Member count not available
        }

        return {
          id: entity.id.toString(),
          type: "channel",
          title: entity.title || undefined,
          username: entity.username || undefined,
          membersCount,
          description: undefined, // Channel description requires additional API call
          isBanned: false, // If we can get it, it's not banned
        };
      }

      // Handle Chat (group)
      if (entity instanceof Api.Chat) {
        return {
          id: entity.id.toString(),
          type: "group",
          title: entity.title || undefined,
          isBanned: false,
        };
      }

      // Handle ChatForbidden (banned group)
      if (entity instanceof Api.ChatForbidden) {
        return {
          id: entity.id.toString(),
          type: "group",
          title: entity.title || undefined,
          isBanned: true,
          error: "Chat is forbidden (banned)",
        };
      }

      // Handle ChannelForbidden (banned channel)
      if (entity instanceof Api.ChannelForbidden) {
        return {
          id: entity.id.toString(),
          type: "channel",
          title: entity.title || undefined,
          isBanned: true,
          error: "Channel is forbidden (banned)",
        };
      }

      // Unknown entity type
      return {
        id: entityId,
        type: "channel",
        isBanned: false,
        error: "Unknown entity type",
      };
    } catch (error: any) {
      // Check for specific errors
      const errorMessage = error?.message || error?.toString() || "";

      // If entity not found, it might be banned or doesn't exist
      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("USERNAME_NOT_OCCUPIED") ||
        errorMessage.includes("USERNAME_INVALID")
      ) {
        return {
          id: entityId,
          type: "channel",
          username: entityId,
          isBanned: true,
          error: "Entity not found (likely banned or doesn't exist)",
        };
      }

      // For private users/channels, we might not have access
      if (
        errorMessage.includes("private") ||
        errorMessage.includes("PRIVACY") ||
        errorMessage.includes("CHANNEL_PRIVATE")
      ) {
        return {
          id: entityId,
          type: "channel",
          username: entityId,
          isBanned: false,
          error: "Private entity (cannot access without being a member)",
        };
      }

      // Other errors
      console.warn(`Error getting entity ${target}:`, errorMessage);
      return {
        id: entityId,
        type: "channel",
        username: entityId,
        isBanned: false,
        error: errorMessage || "Unknown error",
      };
    }
  } catch (error: any) {
    console.error("Error in getMTProtoChatDetails:", error);
    return {
      id: target,
      type: "channel",
      isBanned: false,
      error: error.message || "Failed to get chat details via MTProto",
    };
  } finally {
    // For serverless, disconnect after use to free resources
    // For long-running processes, keep connected
    const isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    if (isServerless && client && client.connected) {
      try {
        await client.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
  }
}

/**
 * Check if a username/channel is banned or unavailable using MTProto
 */
export async function checkMTProtoUsernameStatus(
  target: string
): Promise<{ isBanned: boolean; error?: string; details?: MTProtoChatDetails }> {
  const details = await getMTProtoChatDetails(target);
  return {
    isBanned: details.isBanned,
    error: details.error,
    details,
  };
}

