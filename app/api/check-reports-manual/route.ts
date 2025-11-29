import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Manual trigger endpoint for testing
 * Only accessible by authenticated admin
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth || auth.value !== "1") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Call the check-reports endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (request.headers.get("origin") || "http://localhost:3000");
    
    const response = await fetch(`${baseUrl}/api/check-reports`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET || "dev-secret"}`,
      },
    });

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in manual check:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

