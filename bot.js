import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/index.js";
import { NewMessage } from "telegram/events/index.js";

// ==========================
// CONFIG
// ==========================
const API_ID = 26481096;
const API_HASH = "490e357d5a2d4dae14b23fa74087f17d";
const BOT_TOKEN = "7858857706:AAHhjCwdlZ-DZS1WtsRmCXyDyh-Zur0cF_U";

// Session (can be empty string for bot tokens, or store in DB for persistence)
const session = new StringSession("");

// Create client
const client = new TelegramClient(session, API_ID, API_HASH, {
  connectionRetries: 5,
});

// ==========================
// HELPERS
// ==========================
function buildFullName(firstName, lastName) {
  const parts = [];
  if (firstName) parts.push(firstName);
  if (lastName) parts.push(lastName);
  return parts.length > 0 ? parts.join(" ") : "(no name)";
}

function formatUserInfo(user) {
  const fullName = buildFullName(user.firstName || null, user.lastName || null);
  const usernameDisplay = user.username ? `@${user.username}` : "(no username)";
  return (
    "📌 USER INFO\n" +
    `• ID: \`${user.id}\`\n` +
    `• Name: *${fullName}*\n` +
    `• Username: *${usernameDisplay}*`
  );
}

function formatChatInfo(entity) {
  const title = "title" in entity && entity.title ? entity.title : "(no title)";
  const usernameDisplay = "username" in entity && entity.username 
    ? `@${entity.username}` 
    : "(no username)";
  return (
    "📌 CHAT INFO\n" +
    `• ID: \`${entity.id}\`\n` +
    `• Title: *${title}*\n` +
    `• Username: *${usernameDisplay}*`
  );
}

function extractUsername(text) {
  if (!text) return null;

  const trimmed = text.trim();

  // ignore commands
  if (trimmed.startsWith("/")) return null;

  // single token: "@user" or "user"
  if (!trimmed.includes(" ")) {
    if (trimmed.startsWith("@")) {
      return trimmed.substring(1);
    }
    return trimmed;
  }

  // multi-word: pick first @username
  for (const part of trimmed.split(" ")) {
    if (part.startsWith("@") && part.length > 1) {
      return part.substring(1);
    }
  }

  return null;
}
// ==========================
// HANDLERS
// ==========================
client.addEventHandler(async (event) => {
  const msg = event.message;

  // Handle /start command
  if (msg.text && msg.text.startsWith("/start")) {
    await msg.reply({
      message: "👋 *User Info Bot (GramJS)*\n\n" +
        "Send me:\n" +
        "• Forwarded message from a user → I'll show their ID, name, username\n" +
        "• Or send @username / username (works only if I can see them)\n",
      parseMode: "md"
    });
    return;
  }

  // 1) Forwarded message → get original user
  if (msg.fwdFrom && msg.fwdFrom.fromId && "userId" in msg.fwdFrom.fromId) {
    const userId = msg.fwdFrom.fromId.userId;
    try {
      const entity = await client.getEntity(userId);
      if (entity instanceof Api.User) {
        const text = formatUserInfo(entity);
        await msg.reply({
          message: text,
          parseMode: "md"
        });
      } else {
        await msg.reply({
          message: "Forwarded entity is not a user."
        });
      }
    } catch (e) {
      await msg.reply({
        message: `⚠ Could not fetch user from forwarded message.\n\`${e.message || e}\``,
        parseMode: "md"
      });
    }
    return;
  }

  // 2) Username text → resolve entity
  if (msg.text) {
    const username = extractUsername(msg.text);
    if (!username) {
      return; // ignore random text
    }

    try {
      const entity = await client.getEntity(username);
      if (entity instanceof Api.User) {
        const text = formatUserInfo(entity);
        await msg.reply({
          message: text,
          parseMode: "md"
        });
      } else if (entity instanceof Api.Channel || entity instanceof Api.Chat) {
        const text = formatChatInfo(entity);
        await msg.reply({
          message: text,
          parseMode: "md"
        });
      } else {
        await msg.reply({
          message: "Resolved entity is not a user/chat/channel."
        });
      }
    } catch (e) {
      await msg.reply({
        message: "⚠ I couldn't resolve that username.\n" +
          "• For bots: username lookup only works if the user/channel/group is public or has interacted with me.\n" +
          `\`${e.message || e}\``,
        parseMode: "md"
      });
    }
    return;
  }

  // 3) Non-text & non-forward
  await msg.reply({
    message: "Forward a message from the user or send their @username as text."
  });
}, new NewMessage({}));
// ==========================
// MAIN
// ==========================
async function main() {
  // Start with bot token (NOT phone number)
  await client.start({
    botAuthToken: BOT_TOKEN,
  });

  const me = await client.getMe();
  console.log(
    `Logged in as BOT: ${me.id} ${me.firstName || ""} (@${me.username || ""})`
  );

  console.log("Bot is running. Press Ctrl+C to stop.");
  await client.connect();
}

// Run
main().catch(console.error);