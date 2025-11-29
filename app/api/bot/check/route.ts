import { NextRequest, NextResponse } from "next/server";
import { getChatDetails } from "@/lib/telegram-bot";
import { getReports } from "@/lib/storage-supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("target");

    if (!target) {
      return NextResponse.json(
        { error: "Target is required" },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot not configured" },
        { status: 500 }
      );
    }

    const details = await getChatDetails(botToken, target);

    // Check if we have a report for this target
    const reports = await getReports();
    const relatedReport = reports.find(
      (r) => r.target.toLowerCase().includes(target.toLowerCase().replace("@", ""))
    );

    return NextResponse.json({
      success: true,
      target,
      details,
      relatedReport: relatedReport
        ? {
            id: relatedReport.id,
            status: relatedReport.status,
            createdAt: relatedReport.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Error in bot check:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

