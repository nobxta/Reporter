import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { updateReportStatus, getReportById, getSettings } from "@/lib/storage-supabase";
import { sendEmail, type EmailConfig } from "@/lib/email";
import { sendTelegramNotification, formatBanNotification } from "@/lib/telegram-bot";

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

    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    const report = await getReportById(reportId);
    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    if (!report.complaintSubject || !report.complaintBody) {
      return NextResponse.json(
        { error: "Complaint not generated" },
        { status: 400 }
      );
    }

    // Get settings for support emails
    const settings = await getSettings();
    const supportEmails = settings.support_emails || [process.env.TELEGRAM_SUPPORT_EMAIL || "abuse@telegram.org"];

    // Email configuration from environment
    const baseEmailConfig: Omit<EmailConfig, "to"> = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER || "",
      password: process.env.SMTP_PASSWORD || "",
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    };

    // Send email to all support emails
    const emailResults = [];
    for (const email of supportEmails) {
      const emailConfig: EmailConfig = {
        ...baseEmailConfig,
        to: email,
      };

      const emailResult = await sendEmail(
        emailConfig,
        report.complaintSubject || "",
        report.complaintBody || ""
      );

      emailResults.push({ email, success: emailResult.success, error: emailResult.error });

      // Small delay between emails
      if (supportEmails.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Check if at least one email was sent successfully
    const hasSuccess = emailResults.some((r) => r.success);
    if (!hasSuccess) {
      return NextResponse.json(
        { error: `Failed to send emails: ${emailResults.map((r) => r.error).join(", ")}` },
        { status: 500 }
      );
    }

    // Update report status
    await updateReportStatus(reportId, "sent", {
      complaintSubject: report.complaintSubject,
      complaintBody: report.complaintBody,
    });

    return NextResponse.json({
      success: true,
      message: "Report sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Endpoint to mark a report as banned (can be called manually or by webhook)
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth || auth.value !== "1") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    const report = await getReportById(reportId);
    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Update status to banned
    await updateReportStatus(reportId, "banned");

    // Send Telegram notification if bot is configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const settings = await getSettings();
    // Use chat ID from Settings (stored in Supabase), fallback to env var if not set
    const chatId = settings.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const notification = formatBanNotification(report.target, reportId);
      await sendTelegramNotification(botToken, chatId, notification);
    }

    return NextResponse.json({
      success: true,
      message: "Report marked as banned",
    });
  } catch (error: any) {
    console.error("Error updating report status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

