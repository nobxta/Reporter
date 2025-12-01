import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

/**
 * Session pool manager for multi-token checker system
 * Manages multiple MTProto sessions and handles FLOOD_WAIT rotation
 */

interface SessionInfo {
  botToken: string;
  client: TelegramClient | null;
  isConnecting: boolean;
  connectionPromise: Promise<TelegramClient> | null;
  floodCooldownUntil: number | null; // Timestamp when cooldown expires
  lastUsed: number; // Timestamp of last use
  sessionString: string | null; // Cached session string for reuse
}

class SessionPool {
  private sessions: Map<string, SessionInfo> = new Map();
  private readonly API_ID: number;
  private readonly API_HASH: string;
  private readonly isServerless: boolean;

  constructor() {
    this.API_ID = parseInt(process.env.TELEGRAM_API_ID || "");
    this.API_HASH = process.env.TELEGRAM_API_HASH || "";
    this.isServerless = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    if (!this.API_ID || !this.API_HASH) {
      console.warn("[SessionPool] TELEGRAM_API_ID or TELEGRAM_API_HASH not set");
    }
  }

  /**
   * Initialize sessions for all provided bot tokens
   */
  async initializeSessions(botTokens: string[]): Promise<void> {
    if (!this.API_ID || !this.API_HASH) {
      throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH must be set");
    }

    // Remove sessions for tokens that are no longer in the list
    for (const [token, session] of this.sessions.entries()) {
      if (!botTokens.includes(token)) {
        await this.disconnectSession(session);
        this.sessions.delete(token);
      }
    }

    // Add/update sessions for new tokens
    for (const token of botTokens) {
      if (!this.sessions.has(token)) {
        this.sessions.set(token, {
          botToken: token,
          client: null,
          isConnecting: false,
          connectionPromise: null,
          floodCooldownUntil: null,
          lastUsed: 0,
          sessionString: null,
        });
      }
    }
  }

  /**
   * Get an available session (not in FLOOD cooldown)
   * Returns null if all sessions are in cooldown
   */
  getAvailableSession(): SessionInfo | null {
    const now = Date.now();
    const available: SessionInfo[] = [];

    for (const session of this.sessions.values()) {
      // Check if session is available (not in cooldown)
      if (session.floodCooldownUntil === null || session.floodCooldownUntil <= now) {
        available.push(session);
      }
    }

    if (available.length === 0) {
      return null; // All sessions are in cooldown
    }

    // Return the least recently used available session
    available.sort((a, b) => a.lastUsed - b.lastUsed);
    return available[0];
  }

  /**
   * Get the session with the shortest remaining cooldown
   * Returns null if no sessions exist
   */
  getSessionWithShortestCooldown(): SessionInfo | null {
    if (this.sessions.size === 0) {
      return null;
    }

    const now = Date.now();
    let bestSession: SessionInfo | null = null;
    let shortestCooldown = Infinity;

    for (const session of this.sessions.values()) {
      if (session.floodCooldownUntil === null) {
        // This session is available, return it immediately
        return session;
      }

      const remainingCooldown = session.floodCooldownUntil - now;
      if (remainingCooldown < shortestCooldown && remainingCooldown > 0) {
        shortestCooldown = remainingCooldown;
        bestSession = session;
      }
    }

    return bestSession;
  }

  /**
   * Mark a session as rate-limited (FLOOD_WAIT)
   */
  markSessionAsRateLimited(botToken: string, seconds: number): void {
    const session = this.sessions.get(botToken);
    if (session) {
      const cooldownMs = seconds * 1000;
      session.floodCooldownUntil = Date.now() + cooldownMs;
      console.log(
        `[SessionPool] 🟡 Session rate-limited: ${botToken.substring(0, 10)}... (cooldown: ${seconds}s, until: ${new Date(session.floodCooldownUntil).toISOString()})`
      );
    }
  }

  /**
   * Get or create a client for a specific session
   */
  async getClient(sessionInfo: SessionInfo): Promise<TelegramClient> {
    // If already connected and not serverless, reuse
    if (!this.isServerless && sessionInfo.client && sessionInfo.client.connected) {
      sessionInfo.lastUsed = Date.now();
      return sessionInfo.client;
    }

    // If already connecting, wait for that promise
    if (sessionInfo.isConnecting && sessionInfo.connectionPromise) {
      return sessionInfo.connectionPromise;
    }

    // Create new client
    const session = new StringSession(sessionInfo.sessionString || "");
    const client = new TelegramClient(session, this.API_ID, this.API_HASH, {
      connectionRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
    });

    sessionInfo.isConnecting = true;
    sessionInfo.connectionPromise = (async () => {
      try {
        await client.start({
          botAuthToken: sessionInfo.botToken,
        });

        // Save session string for reuse
        sessionInfo.sessionString = client.session.save() as unknown as string;

        if (!this.isServerless) {
          sessionInfo.client = client;
        }

        sessionInfo.isConnecting = false;
        sessionInfo.connectionPromise = null;
        sessionInfo.lastUsed = Date.now();

        return client;
      } catch (error) {
        sessionInfo.isConnecting = false;
        sessionInfo.connectionPromise = null;
        throw error;
      }
    })();

    return sessionInfo.connectionPromise;
  }

  /**
   * Disconnect a session
   */
  private async disconnectSession(sessionInfo: SessionInfo): Promise<void> {
    if (sessionInfo.client && sessionInfo.client.connected) {
      try {
        await sessionInfo.client.disconnect();
      } catch (error) {
        console.error("[SessionPool] Error disconnecting session:", error);
      }
    }
    sessionInfo.client = null;
    sessionInfo.isConnecting = false;
    sessionInfo.connectionPromise = null;
  }

  /**
   * Cleanup: disconnect all sessions (for serverless)
   */
  async cleanup(): Promise<void> {
    if (this.isServerless) {
      const promises: Promise<void>[] = [];
      for (const session of this.sessions.values()) {
        if (session.client && session.client.connected) {
          promises.push(
            session.client.disconnect().catch((err) => {
              console.error("[SessionPool] Error during cleanup:", err);
            })
          );
        }
      }
      await Promise.all(promises);
    }
  }

  /**
   * Get pool status (for debugging)
   */
  getStatus(): {
    totalSessions: number;
    availableSessions: number;
    rateLimitedSessions: number;
    sessions: Array<{
      token: string;
      isConnected: boolean;
      cooldownUntil: number | null;
      lastUsed: number;
    }>;
  } {
    const now = Date.now();
    let available = 0;
    let rateLimited = 0;

    const sessions = Array.from(this.sessions.values()).map((s) => {
      const isAvailable = s.floodCooldownUntil === null || s.floodCooldownUntil <= now;
      if (isAvailable) {
        available++;
      } else {
        rateLimited++;
      }

      return {
        token: s.botToken.substring(0, 15) + "...",
        isConnected: s.client?.connected || false,
        cooldownUntil: s.floodCooldownUntil,
        lastUsed: s.lastUsed,
      };
    });

    return {
      totalSessions: this.sessions.size,
      availableSessions: available,
      rateLimitedSessions: rateLimited,
      sessions,
    };
  }
}

// Singleton instance
let sessionPoolInstance: SessionPool | null = null;

export function getSessionPool(): SessionPool {
  if (!sessionPoolInstance) {
    sessionPoolInstance = new SessionPool();
  }
  return sessionPoolInstance;
}

