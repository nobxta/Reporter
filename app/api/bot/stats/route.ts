import { NextRequest, NextResponse } from "next/server";
import { getReports } from "@/lib/storage-supabase";

export async function GET(request: NextRequest) {
  try {
    const reports = await getReports();

    const total = reports.length;
    const sent = reports.filter((r) => r.status === "sent").length;
    const banned = reports.filter((r) => r.status === "banned").length;
    const pending = reports.filter((r) => r.status === "pending").length;

    // Calculate success rate (banned / sent)
    const successRate = sent > 0 ? Math.round((banned / sent) * 100) : 0;

    // Get last 24h reports
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = reports.filter(
      (r) => new Date(r.createdAt) > last24h
    );
    const recentSent = recentReports.filter((r) => r.status === "sent").length;
    const recentBanned = recentReports.filter((r) => r.status === "banned").length;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        sent,
        banned,
        pending,
        successRate,
        last24h: {
          reports: recentReports.length,
          sent: recentSent,
          banned: recentBanned,
        },
      },
    });
  } catch (error: any) {
    console.error("Error in bot stats:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

