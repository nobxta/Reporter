import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings, updateSettings } from "@/lib/storage-supabase";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth || auth.value !== "1") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const settings = await getSettings();

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth || auth.value !== "1") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { support_emails, check_interval_minutes, telegram_chat_id, notify_on_no_ban, checker_bot_tokens } = body;

    // Validate support_emails
    if (support_emails !== undefined) {
      if (!Array.isArray(support_emails) || support_emails.length === 0) {
        return NextResponse.json(
          { error: "support_emails must be a non-empty array" },
          { status: 400 }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of support_emails) {
        if (typeof email !== "string" || !emailRegex.test(email)) {
          return NextResponse.json(
            { error: `Invalid email format: ${email}` },
            { status: 400 }
          );
        }
      }
    }

    // Validate check_interval_minutes
    if (check_interval_minutes !== undefined) {
      const interval = parseInt(check_interval_minutes);
      if (isNaN(interval) || interval < 1 || interval > 120) {
        return NextResponse.json(
          { error: "check_interval_minutes must be between 1 and 120" },
          { status: 400 }
        );
      }
    }

    // Validate telegram_chat_id
    if (telegram_chat_id !== undefined && telegram_chat_id !== null) {
      if (typeof telegram_chat_id !== "string" || telegram_chat_id.trim() === "") {
        return NextResponse.json(
          { error: "telegram_chat_id must be a non-empty string or null" },
          { status: 400 }
        );
      }
    }

    // Validate notify_on_no_ban
    if (notify_on_no_ban !== undefined) {
      if (typeof notify_on_no_ban !== "boolean") {
        return NextResponse.json(
          { error: "notify_on_no_ban must be a boolean" },
          { status: 400 }
        );
      }
    }

    // Validate checker_bot_tokens
    if (checker_bot_tokens !== undefined) {
      if (!Array.isArray(checker_bot_tokens)) {
        return NextResponse.json(
          { error: "checker_bot_tokens must be an array" },
          { status: 400 }
        );
      }
      
      // Validate each token is a non-empty string
      for (const token of checker_bot_tokens) {
        if (typeof token !== "string" || token.trim() === "") {
          return NextResponse.json(
            { error: "Each checker_bot_token must be a non-empty string" },
            { status: 400 }
          );
        }
      }
    }

    const updates: any = {};
    if (support_emails !== undefined) updates.support_emails = support_emails;
    if (check_interval_minutes !== undefined) updates.check_interval_minutes = check_interval_minutes;
    if (telegram_chat_id !== undefined) updates.telegram_chat_id = telegram_chat_id || null;
    if (notify_on_no_ban !== undefined) updates.notify_on_no_ban = notify_on_no_ban;
    if (checker_bot_tokens !== undefined) updates.checker_bot_tokens = checker_bot_tokens;

    const settings = await updateSettings(updates);

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

