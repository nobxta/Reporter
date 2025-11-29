import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { updateReportStatus, getReportById, getSettings } from "@/lib/storage-supabase";
import { sendEmail, type EmailConfig } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth");

    if (!auth || auth.value !== "1") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { reportId } = await request.json();

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: "Report ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const report = await getReportById(reportId);
    if (!report) {
      return new Response(
        JSON.stringify({ error: "Report not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!report.complaintSubject || !report.complaintBody) {
      return new Response(
        JSON.stringify({ error: "Complaint not generated" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send initial processing message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "processing", message: "Processing..." })}\n\n`)
        );

        // Send email to all support emails
        const emailResults = [];
        for (let i = 0; i < supportEmails.length; i++) {
          const email = supportEmails[i];
          
          // Send progress update
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "sending", email, index: i + 1, total: supportEmails.length })}\n\n`)
          );

          const emailConfig: EmailConfig = {
            ...baseEmailConfig,
            to: email,
          };

          try {
            const emailResult = await sendEmail(
              emailConfig,
              report.complaintSubject || "",
              report.complaintBody || ""
            );

            emailResults.push({ email, success: emailResult.success, error: emailResult.error });

            if (emailResult.success) {
              // Send success message
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "sent", email, message: `Sent to ${email}` })}\n\n`)
              );
            } else {
              // Send error message
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", email, message: `Failed to send to ${email}: ${emailResult.error}` })}\n\n`)
              );
            }
          } catch (err: any) {
            emailResults.push({ email, success: false, error: err.message });
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", email, message: `Failed to send to ${email}: ${err.message}` })}\n\n`)
            );
          }

          // Small delay between emails
          if (i < supportEmails.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // Check if at least one email was sent successfully
        const hasSuccess = emailResults.some((r) => r.success);
        if (!hasSuccess) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "failed", message: `Failed to send emails: ${emailResults.map((r) => r.error).join(", ")}` })}\n\n`)
          );
          controller.close();
          return;
        }

        // Update report status
        await updateReportStatus(reportId, "sent", {
          complaintSubject: report.complaintSubject,
          complaintBody: report.complaintBody,
        });

        // Send completion message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "completed", message: "All emails sent successfully!", results: emailResults })}\n\n`)
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error sending report:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

