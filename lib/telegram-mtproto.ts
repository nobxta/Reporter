import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
import { getSessionPool } from "./telegram-session-pool";
import { getSettings } from "./storage-supabase";

/**
 * Status classification for target availability:
 * - "active": Target is resolvable and accessible
 * - "banned": Target is banned, deleted, or permanently unavailable
 * - "unknown": Temporary issue (network error) - cannot determine status
 * - "rate_limited": FLOOD_WAIT error - rate limited, need to retry later
 */
export type TargetStatus = "active" | "banned" | "unknown" | "rate_limited";

export interface MTProtoChatDetails {
  id: string | number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  membersCount?: number;
  description?: string;
  isBanned: boolean; // Deprecated: use status instead
  status: TargetStatus; // Primary status indicator
  error?: string;
  errorCode?: string; // MTProto error code if available
  retryAfterSeconds?: number; // For FLOOD_WAIT errors
  // User-specific fields
  isBot?: boolean;
  isScam?: boolean;
  isFake?: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  isRestricted?: boolean;
  // Link
  link?: string;
}

/**
 * Get an available client from the session pool
 * Returns null if all sessions are rate-limited
 */
async function getMTProtoClientFromPool(): Promise<{ client: TelegramClient; sessionInfo: any } | null> {
  const sessionPool = getSessionPool();
  
  // Get settings to initialize sessions
  const settings = await getSettings();
  const checkerTokens = settings.checker_bot_tokens || [];
  
  // Fallback to main bot token if no checker tokens configured
  const tokens = checkerTokens.length > 0 
    ? checkerTokens 
    : (process.env.TELEGRAM_BOT_TOKEN ? [process.env.TELEGRAM_BOT_TOKEN] : []);
  
  if (tokens.length === 0) {
    throw new Error("No checker bot tokens configured. Please add tokens in Settings.");
  }
  
  // Initialize sessions for all tokens
  await sessionPool.initializeSessions(tokens);
  
  // Get an available session
  const sessionInfo = sessionPool.getAvailableSession();
  
  if (!sessionInfo) {
    // All sessions are rate-limited
    const shortestCooldown = sessionPool.getSessionWithShortestCooldown();
    if (shortestCooldown && shortestCooldown.floodCooldownUntil) {
      const remainingSeconds = Math.ceil((shortestCooldown.floodCooldownUntil - Date.now()) / 1000);
      console.warn(`[MTProto] All sessions rate-limited. Shortest cooldown: ${remainingSeconds}s`);
      return null;
    }
    // No sessions available at all
    return null;
  }
  
  // Get or create client for this session
  const client = await sessionPool.getClient(sessionInfo);
  
  return { client, sessionInfo };
}

/**
 * Get detailed information about a chat/user/channel using MTProto
 * This can resolve usernames that Telegraf cannot access
 */
export async function getMTProtoChatDetails(
  target: string
): Promise<MTProtoChatDetails> {
  let client: TelegramClient | null = null;
  let sessionInfo: any = null;
  const sessionPool = getSessionPool();

  try {
    // Get client from session pool
    const poolResult = await getMTProtoClientFromPool();
    
    if (!poolResult) {
      // All sessions are rate-limited
      return {
        id: target,
        type: "channel",
        isBanned: false,
        status: "rate_limited",
        error: "All checker sessions are rate-limited. Please try again later.",
        errorCode: "FLOOD_WAIT",
        retryAfterSeconds: undefined, // Could calculate from shortest cooldown if needed
      };
    }
    
    client = poolResult.client;
    sessionInfo = poolResult.sessionInfo;

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
        status: "unknown",
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
        const username = entity.username || undefined;
        const link = username ? `https://t.me/${username}` : undefined;
        const isDeleted = entity.deleted || false;
        
        return {
          id: entity.id.toString(),
          type: "private",
          firstName: entity.firstName || undefined,
          lastName: entity.lastName || undefined,
          username,
          isBanned: isDeleted,
          status: isDeleted ? "banned" : "active",
          description: undefined,
          isBot: entity.bot || false,
          isScam: entity.scam || false,
          isFake: entity.fake || false,
          isPremium: entity.premium || false,
          isVerified: entity.verified || false,
          isRestricted: entity.restricted || false,
          link,
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

        const username = entity.username || undefined;
        const link = username ? `https://t.me/${username}` : undefined;
        
        return {
          id: entity.id.toString(),
          type: "channel",
          title: entity.title || undefined,
          username,
          membersCount,
          description: undefined, // Channel description requires additional API call
          isBanned: false, // If we can get it, it's not banned
          status: "active", // Successfully resolved = active
          isVerified: entity.verified || false,
          isScam: entity.scam || false,
          isFake: entity.fake || false,
          isRestricted: entity.restricted || false,
          link,
        };
      }

      // Handle Chat (group)
      if (entity instanceof Api.Chat) {
        return {
          id: entity.id.toString(),
          type: "group",
          title: entity.title || undefined,
          isBanned: false,
          status: "active",
        };
      }

      // Handle ChatForbidden (banned group)
      if (entity instanceof Api.ChatForbidden) {
        return {
          id: entity.id.toString(),
          type: "group",
          title: entity.title || undefined,
          isBanned: true,
          status: "banned",
          error: "Chat is forbidden (banned)",
          errorCode: "CHAT_FORBIDDEN",
        };
      }

      // Handle ChannelForbidden (banned channel)
      if (entity instanceof Api.ChannelForbidden) {
        return {
          id: entity.id.toString(),
          type: "channel",
          title: entity.title || undefined,
          isBanned: true,
          status: "banned",
          error: "Channel is forbidden (banned)",
          errorCode: "CHANNEL_FORBIDDEN",
        };
      }

      // Unknown entity type
      return {
        id: entityId,
        type: "channel",
        isBanned: false,
        status: "unknown",
        error: "Unknown entity type",
      };
    } catch (error: any) {
      // Check for specific errors
      const errorMessage = error?.message || error?.toString() || "";
      const errorCode = error?.code || error?.errorCode || "";
      const errorType = error?.constructor?.name || "";

      // Extract FLOOD_WAIT seconds if present
      let retryAfterSeconds: number | undefined;
      const floodMatch = errorMessage.match(/wait of (\d+) seconds/i);
      if (floodMatch) {
        retryAfterSeconds = parseInt(floodMatch[1]);
      }

      /**
       * STATUS CLASSIFICATION LOGIC:
       * 
       * "banned" status is used for:
       * - USERNAME_NOT_OCCUPIED, USERNAME_INVALID, CHANNEL_INVALID
       * - PEER_ID_INVALID, INPUT_USER_DEACTIVATED
       * - USER_DELETED, USER_BANNED_IN_CHANNEL
       * - CHAT_ADMIN_REQUIRED (when cannot access at all)
       * - Any "not found" errors (404, entity not found)
       * 
       * "unknown" status is used for:
       * - FLOOD_WAIT / rate limiting (420, 429)
       * - Temporary network/connection errors
       * - Auth errors that might be temporary
       * 
       * "active" status is only used when:
       * - Entity is successfully resolved and accessible
       */

      // Check for FLOOD_WAIT / rate limiting (temporary - should be "rate_limited")
      if (errorMessage.includes("FLOOD_WAIT") || errorCode === 429 || errorCode === 420 || error?.errorMessage === "FLOOD") {
        // Extract seconds from error object or message
        const seconds = error?.seconds || retryAfterSeconds || 0;
        
        // Mark the session as rate-limited
        if (sessionInfo && seconds > 0) {
          sessionPool.markSessionAsRateLimited(sessionInfo.botToken, seconds);
        }
        
        return {
          id: entityId,
          type: "channel",
          username: entityId,
          isBanned: false,
          status: "rate_limited",
          error: `Rate limited: ${errorMessage}`,
          errorCode: errorCode || "FLOOD_WAIT",
          retryAfterSeconds: seconds,
        };
      }

      // Check for banned/unavailable errors (permanent - should be "banned")
      const errorMessageLower = errorMessage.toLowerCase();
      const isBannedError = 
        errorMessage.includes("USERNAME_NOT_OCCUPIED") ||
        errorMessage.includes("USERNAME_INVALID") ||
        errorMessage.includes("CHANNEL_INVALID") ||
        errorMessage.includes("PEER_ID_INVALID") ||
        errorMessage.includes("INPUT_USER_DEACTIVATED") ||
        errorMessage.includes("USER_DELETED") ||
        errorMessage.includes("USER_BANNED_IN_CHANNEL") ||
        errorMessage.includes("CHANNEL_PUBLIC_GROUP_NA") ||
        errorMessageLower.includes("not found") ||
        errorMessageLower.includes("cannot find any entity") ||
        errorMessageLower.includes("no user has") ||
        errorMessageLower.includes("no channel has") ||
        errorMessageLower.includes("entity corresponding to") ||
        errorMessageLower.includes("does not exist") ||
        errorMessageLower.includes("doesn't exist") ||
        errorCode === 400 || // Bad Request often means invalid/banned
        errorCode === 404 || // Not Found
        errorType === "UsernameNotOccupiedError" ||
        errorType === "ChannelInvalidError" ||
        errorType === "UserDeactivatedError" ||
        errorType === "PeerIdInvalidError" ||
        (errorMessageLower.includes("username") && errorMessageLower.includes("invalid")) ||
        (errorMessageLower.includes("channel") && errorMessageLower.includes("invalid"));

      if (isBannedError) {
        return {
          id: entityId,
          type: "channel",
          username: entityId,
          isBanned: true,
          status: "banned",
          error: `Entity not found or unavailable: ${errorMessage}`,
          errorCode: errorCode || "NOT_FOUND",
        };
      }

      // Check for private/inaccessible (could be active but private, or could be banned)
      // If we can't access it and it's not explicitly private, treat as banned
      if (
        errorMessage.includes("CHAT_ADMIN_REQUIRED") &&
        !errorMessage.includes("CHANNEL_PRIVATE") &&
        !errorMessage.includes("PRIVACY")
      ) {
        // Admin required but not private = likely banned/inaccessible
        return {
          id: entityId,
          type: "channel",
          username: entityId,
          isBanned: true,
          status: "banned",
          error: "Chat inaccessible (admin required)",
          errorCode: "CHAT_ADMIN_REQUIRED",
        };
      }

      // Private but might still be active (just not accessible)
      if (
        errorMessage.includes("private") ||
        errorMessage.includes("PRIVACY") ||
        errorMessage.includes("CHANNEL_PRIVATE") ||
        errorMessage.includes("USER_PRIVACY_RESTRICTED")
      ) {
        // Private channels/users might still be active, but we can't verify
        // Treat as "unknown" since we can't determine actual status
        return {
          id: entityId,
          type: "channel",
          username: entityId,
          isBanned: false,
          status: "unknown",
          error: "Private entity (cannot verify status without access)",
          errorCode: "PRIVATE",
        };
      }

      // Other errors - treat as unknown (temporary issues)
      console.warn(`Error getting entity ${target}:`, {
        message: errorMessage,
        code: errorCode,
        type: errorType,
        error: error,
      });
      return {
        id: entityId,
        type: "channel",
        username: entityId,
        isBanned: false,
        status: "unknown",
        error: errorMessage || "Unknown error",
        errorCode: errorCode || "UNKNOWN",
      };
    }
  } catch (error: any) {
    console.error("Error in getMTProtoChatDetails:", error);
    const errorMessage = error?.message || error?.toString() || "";
    const errorCode = error?.code || error?.errorCode || "";
    const errorType = error?.constructor?.name || "";
    const errorMessageLower = errorMessage.toLowerCase();
    
    // Check if it's a FLOOD_WAIT error (rate limited)
    const floodMatch = errorMessage.match(/wait of (\d+) seconds/i);
    const seconds = error?.seconds || (floodMatch ? parseInt(floodMatch[1]) : undefined);
    
    // Handle FLOOD errors at the outer catch level
    if (errorMessage.includes("FLOOD_WAIT") || errorCode === 429 || errorCode === 420 || error?.errorMessage === "FLOOD") {
      // Mark the session as rate-limited if we have session info
      if (sessionInfo && seconds && seconds > 0) {
        sessionPool.markSessionAsRateLimited(sessionInfo.botToken, seconds);
      }
      
      return {
        id: target,
        type: "channel",
        isBanned: false,
        status: "rate_limited",
        error: `Rate limited: ${errorMessage}`,
        errorCode: errorCode || "FLOOD_WAIT",
        retryAfterSeconds: seconds,
      };
    }
    
    // Check for banned/unavailable errors (same logic as inner catch)
    const isBannedError = 
      errorMessage.includes("USERNAME_NOT_OCCUPIED") ||
      errorMessage.includes("USERNAME_INVALID") ||
      errorMessage.includes("CHANNEL_INVALID") ||
      errorMessage.includes("PEER_ID_INVALID") ||
      errorMessage.includes("INPUT_USER_DEACTIVATED") ||
      errorMessage.includes("USER_DELETED") ||
      errorMessage.includes("USER_BANNED_IN_CHANNEL") ||
      errorMessage.includes("CHANNEL_PUBLIC_GROUP_NA") ||
      errorMessageLower.includes("not found") ||
      errorMessageLower.includes("cannot find any entity") ||
      errorMessageLower.includes("no user has") ||
      errorMessageLower.includes("no channel has") ||
      errorMessageLower.includes("entity corresponding to") ||
      errorMessageLower.includes("does not exist") ||
      errorMessageLower.includes("doesn't exist") ||
      errorCode === 400 ||
      errorCode === 404 ||
      errorType === "UsernameNotOccupiedError" ||
      errorType === "ChannelInvalidError" ||
      errorType === "UserDeactivatedError" ||
      errorType === "PeerIdInvalidError" ||
      (errorMessageLower.includes("username") && errorMessageLower.includes("invalid")) ||
      (errorMessageLower.includes("channel") && errorMessageLower.includes("invalid"));
    
    if (isBannedError) {
      return {
        id: target,
        type: "channel",
        isBanned: true,
        status: "banned",
        error: `Entity not found or unavailable: ${errorMessage}`,
        errorCode: errorCode || "NOT_FOUND",
      };
    }
    
    // Default to unknown for other errors
    return {
      id: target,
      type: "channel",
      isBanned: false,
      status: "unknown",
      error: errorMessage || "Failed to get chat details via MTProto",
      retryAfterSeconds,
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
    
    // Cleanup session pool for serverless
    if (isServerless) {
      await sessionPool.cleanup();
    }
  }
}

/**
 * Check if a username/channel is banned or unavailable using MTProto
 * Returns status classification: "active", "banned", or "unknown"
 */
export async function checkMTProtoUsernameStatus(
  target: string
): Promise<{ 
  isBanned: boolean; // Deprecated: use status instead
  status: TargetStatus; // Primary status indicator
  error?: string; 
  errorCode?: string;
  retryAfterSeconds?: number;
  details?: MTProtoChatDetails 
}> {
  const details = await getMTProtoChatDetails(target);
  return {
    isBanned: details.isBanned,
    status: details.status,
    error: details.error,
    errorCode: details.errorCode,
    retryAfterSeconds: details.retryAfterSeconds,
    details,
  };
}

