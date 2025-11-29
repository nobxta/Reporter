import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getReportsToCheck,
  updateReportStatus,
  updateReportCheckTime,
  getSettings,
} from "@/lib/storage-supabase";
import {
  checkUsernameStatus,
  sendTelegramNotification,
  formatAutoBanNotification,
} from "@/lib/telegram-bot";

/**
 * This endpoint can be called:
 * 1. Manually by admin (requires auth)
 * 2. By a cron job (can use a secret header for security)
 * 3. By Vercel Cron (if deployed on Vercel)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a cron job call (with secret header) or manual admin call
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // If not a cron call, require admin authentication
    if (!isCronCall) {
      const cookieStore = await cookies();
      const auth = cookieStore.get("auth");

      if (!auth || auth.value !== "1") {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const settings = await getSettings();
    // Use chat ID from Settings (stored in Supabase), fallback to env var if not set
    const chatId = settings.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Telegram bot not configured" },
        { status: 500 }
      );
    }

    // Get reports that need to be checked
    const reportsToCheck = await getReportsToCheck();
    const checkIntervalMinutes = settings.check_interval_minutes || 2;

    if (reportsToCheck.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No reports to check (interval: ${checkIntervalMinutes} minutes)`,
        checked: 0,
        banned: 0,
        interval: checkIntervalMinutes,
      });
    }

    let checkedCount = 0;
    let bannedCount = 0;
    const results: Array<{
      reportId: string;
      target: string;
      status: string;
    }> = [];

    // Check each report
    for (const report of reportsToCheck) {
      try {
        // Update last checked time
        await updateReportCheckTime(report.id);

        // Check if username is banned
        const checkResult = await checkUsernameStatus(botToken, report.target);

        if (checkResult.isBanned) {
          // Mark as banned
          await updateReportStatus(report.id, "banned");

          // Send notification with details
          const notification = formatAutoBanNotification(
            report.target,
            report.id,
            checkResult.details
          );
          await sendTelegramNotification(botToken, chatId, notification);

          bannedCount++;
          results.push({
            reportId: report.id,
            target: report.target,
            status: "banned",
          });

          console.log(`✅ Target banned: ${report.target} (Report ID: ${report.id})`);
        } else {
          results.push({
            reportId: report.id,
            target: report.target,
            status: "active",
          });
        }

        checkedCount++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Error checking report ${report.id}:`, error);
        results.push({
          reportId: report.id,
          target: report.target,
          status: "error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${checkedCount} reports, ${bannedCount} banned`,
      checked: checkedCount,
      banned: bannedCount,
      interval: checkIntervalMinutes,
      results,
    });
  } catch (error: any) {
    console.error("Error in check-reports:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support POST for cron jobs
export async function POST(request: NextRequest) {
  return GET(request);
}

