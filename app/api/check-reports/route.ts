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
 * 1. Manually by admin (requires auth cookie)
 * 2. By a cron job (requires CRON_SECRET via query param ?key=<secret> or Authorization header)
 * 3. By Vercel Cron (if deployed on Vercel)
 * 
 * Authorization methods:
 * - Query param: ?key=<CRON_SECRET>
 * - Header: Authorization: Bearer <CRON_SECRET>
 * - Header: Authorization: <CRON_SECRET> (without Bearer prefix)
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const hasEnv = !!cronSecret;

    // Try to get secret from query parameter
    const { searchParams } = new URL(request.url);
    const queryKey = searchParams.get("key");

    // Try to get secret from Authorization header
    const authHeader = request.headers.get("authorization");
    let headerKey: string | null = null;
    
    if (authHeader) {
      // Support both "Bearer <secret>" and just "<secret>"
      if (authHeader.startsWith("Bearer ")) {
        headerKey = authHeader.substring(7).trim();
      } else {
        headerKey = authHeader.trim();
      }
    }

    // Get the received key (prefer query param, fallback to header)
    const receivedKey = queryKey || headerKey;

    // Check if the received key matches the environment variable
    const matches = hasEnv && receivedKey === cronSecret;
    const isCronCall = matches;

    // If not a cron call, require admin authentication
    if (!isCronCall) {
      // Return debug info when unauthorized (temporary for troubleshooting)
      const debug = {
        receivedKey: receivedKey || null,
        hasEnv,
        matches,
      };

      // Try cookie-based auth for manual admin access
      try {
        const cookieStore = await cookies();
        const auth = cookieStore.get("auth");

        if (!auth || auth.value !== "1") {
          return NextResponse.json(
            { 
              error: "Unauthorized",
              debug, // TODO: Remove debug info in production after verification
            },
            { status: 401 }
          );
        }
      } catch (cookieError) {
        // If cookies() fails (e.g., in edge runtime), return unauthorized with debug
        return NextResponse.json(
          { 
            error: "Unauthorized",
            debug, // TODO: Remove debug info in production after verification
          },
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

    console.log(`[Check Reports] Found ${reportsToCheck.length} reports to check (interval: ${checkIntervalMinutes} minutes)`);

    if (reportsToCheck.length === 0) {
      console.log(`[Check Reports] No reports to check at this time`);
      // Don't send notification when there are no reports to check
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
        console.log(`[Check Reports] Checking report ${report.id}: ${report.target}`);
        
        // Update last checked time
        await updateReportCheckTime(report.id);

        // Parse targets (can be multiple separated by newlines or commas)
        const targets = report.target
          .split(/[\n,]/)
          .map(t => t.trim())
          .filter(t => t.length > 0);

        let allBanned = true;
        let anyBanned = false;
        const targetResults: Array<{ target: string; isBanned: boolean }> = [];

        // Check each target in the report
        for (const target of targets) {
          try {
            console.log(`[Check Reports] Checking target: ${target}`);
            const checkResult = await checkUsernameStatus(botToken, target);
            
            targetResults.push({
              target,
              isBanned: checkResult.isBanned,
            });

            if (checkResult.isBanned) {
              anyBanned = true;
              console.log(`[Check Reports] ✅ Target banned: ${target}`);
            } else {
              allBanned = false;
              console.log(`[Check Reports] 🟢 Target active: ${target}`, {
                error: checkResult.error,
                type: checkResult.details?.type,
              });
            }

            // Small delay between targets to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (targetError: any) {
            console.error(`[Check Reports] Error checking target ${target}:`, targetError);
            allBanned = false;
            targetResults.push({
              target,
              isBanned: false,
            });
          }
        }

        // If any target is banned, mark the report as banned
        if (anyBanned) {
          await updateReportStatus(report.id, "banned");

          // Send notification with details
          const bannedTargets = targetResults
            .filter(tr => tr.isBanned)
            .map(tr => tr.target)
            .join(", ");
          
          const notification = formatAutoBanNotification(
            bannedTargets || report.target,
            report.id,
            undefined
          );
          await sendTelegramNotification(botToken, chatId, notification);

          bannedCount++;
          results.push({
            reportId: report.id,
            target: report.target,
            status: "banned",
          });

          console.log(`[Check Reports] ✅ Report marked as banned: ${report.id}`);
        } else {
          results.push({
            reportId: report.id,
            target: report.target,
            status: "active",
          });
          console.log(`[Check Reports] 🟢 Report still active: ${report.id}`);
        }

        checkedCount++;

        // Small delay between reports to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[Check Reports] Error checking report ${report.id}:`, error);
        results.push({
          reportId: report.id,
          target: report.target,
          status: "error",
        });
      }
    }

    console.log(`[Check Reports] Completed: ${checkedCount} checked, ${bannedCount} banned`);

    // Send summary notification after checking is complete
    // Only send if checking was successful (checkedCount > 0)
    if (checkedCount > 0) {
      if (bannedCount > 0) {
        // Already sent individual ban notifications, no need for summary
        console.log(`[Check Reports] Ban notifications already sent for ${bannedCount} targets`);
      } else {
        // No bans found - send notification only if enabled in settings
        if (settings.notify_on_no_ban) {
          const summaryMessage = `📊 <b>Check Complete</b>\n\n` +
            `Checked: ${checkedCount} reports\n` +
            `Status: No one banned yet\n` +
            `Time: ${new Date().toLocaleString()}`;
          
          await sendTelegramNotification(botToken, chatId, summaryMessage);
          console.log(`[Check Reports] Sent "No one banned yet" notification`);
        } else {
          console.log(`[Check Reports] "No one banned yet" notification disabled in settings`);
        }
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

