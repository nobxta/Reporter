import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateComplaint } from "@/lib/complaint-generator";

/**
 * This endpoint only generates the complaint (subject and body)
 * It does NOT save to database - that happens only when email is sent
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

    const { target, targetType, entityType, violationType, description, evidence, notes } = await request.json();

    // Validate required fields
    if (!target || !violationType || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const reportData = {
      target: target.trim(),
      targetType: targetType || (target.includes("t.me/") || target.startsWith("http") ? "link" : "username"),
      entityType: entityType || "account",
      violationType,
      description: description.trim(),
      evidence: evidence?.trim() || "",
      notes: notes?.trim() || "",
    };

    // Generate complaint (does NOT save to database)
    const { subject, body } = generateComplaint(reportData);

    // Return generated complaint without saving
    return NextResponse.json({
      success: true,
      complaint: {
        subject,
        body,
      },
      reportData, // Include original data for saving later
    });
  } catch (error) {
    console.error("Error generating complaint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

