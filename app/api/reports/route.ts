import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getReports } from "@/lib/storage-supabase";

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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit) : undefined;

    // Return reports, sorted by newest first
    const reports = await getReports(limitNum);

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

