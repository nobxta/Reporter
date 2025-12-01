import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addReport, getSettings } from "@/lib/storage-supabase";
import { sendTelegramNotification, formatNewReportNotification } from "@/lib/telegram-bot";

/**
 * This endpoint saves the report to database
 * Called only when user clicks "Send Report" after editing
 */
export async function POST(request: NextRequest) {
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

    const { target, violationType, description, evidence, notes, complaintSubject, complaintBody } = await request.json();

    // Validate required fields
    if (!target || !violationType || !description || !complaintSubject || !complaintBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save report to database
    const newReport = await addReport({
      target: target.trim(),
      violationType,
      description: description.trim(),
      evidence: evidence?.trim() || "",
      notes: notes?.trim() || "",
      complaintSubject: complaintSubject.trim(),
      complaintBody: complaintBody.trim(),
    });

    console.log("Report saved to database:", newReport);

    // Send Telegram notification for new report
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const settings = await getSettings();
      const chatId = settings.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

      if (botToken && chatId) {
        const notification = formatNewReportNotification(
          newReport.target,
          newReport.id,
          newReport.violationType
        );
        await sendTelegramNotification(botToken, chatId, notification);
        console.log(`Notification sent for new report: ${newReport.id}`);
      }
    } catch (notificationError: any) {
      // Don't fail the request if notification fails
      console.error("Error sending new report notification:", notificationError);
    }

    return NextResponse.json({
      success: true,
      report: newReport,
    });
  } catch (error: any) {
    console.error("Error saving report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

