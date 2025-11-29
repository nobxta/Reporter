import { NextRequest, NextResponse } from "next/server";
import { setupBotCommands } from "@/lib/telegram-bot-setup";
import type { Telegraf } from "telegraf";

let botInstance: ReturnType<typeof setupBotCommands> | null = null;

function getBot() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN not configured");
  }

  if (!botInstance) {
    botInstance = setupBotCommands(botToken);
  }

  return botInstance;
}

export async function POST(request: NextRequest) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Initialize bot and handle webhook update
    const bot = getBot();
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for webhook setup verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: "Telegram webhook endpoint",
    status: "ready",
    commands: ["/start", "/status", "/check", "/info", "/stats"]
  });
}
