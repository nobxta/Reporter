import { getSupabaseAdmin } from "./supabase";
import type { Report, ReportStatus, Settings } from "./database.types";
import { dbReportToApp, appReportToDb } from "./database.types";

// Re-export types for compatibility
export type { ReportStatus };

// Convert database report to app format - this is the AppReport type used throughout the app
export type AppReport = ReturnType<typeof dbReportToApp>;

export async function addReport(
  report: Omit<AppReport, "id" | "createdAt" | "status" | "emailSentAt" | "bannedAt" | "lastChecked">
): Promise<AppReport> {
  const supabase = getSupabaseAdmin();
  const dbReport = appReportToDb({
    target: report.target,
    violationType: report.violationType,
    description: report.description,
    evidence: report.evidence,
    notes: report.notes,
    complaintSubject: report.complaintSubject,
    complaintBody: report.complaintBody,
  });

  const { data, error } = await supabase
    .from("reports")
    .insert(dbReport)
    .select()
    .single();

  if (error) {
    console.error("Error adding report:", error);
    throw error;
  }

  return dbReportToApp(data);
}

export async function updateReportStatus(
  id: string,
  status: ReportStatus,
  additionalData?: Partial<AppReport>
): Promise<AppReport | null> {
  const supabase = getSupabaseAdmin();
  const updateData: any = { status };

  if (status === "sent" && !additionalData?.emailSentAt) {
    updateData.email_sent_at = new Date().toISOString();
  }
  if (status === "banned" && !additionalData?.bannedAt) {
    updateData.banned_at = new Date().toISOString();
  }

  if (additionalData) {
    if (additionalData.complaintSubject !== undefined) {
      updateData.complaint_subject = additionalData.complaintSubject || null;
    }
    if (additionalData.complaintBody !== undefined) {
      updateData.complaint_body = additionalData.complaintBody || null;
    }
  }

  const { data, error } = await supabase
    .from("reports")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating report:", error);
    return null;
  }

  return data ? dbReportToApp(data) : null;
}

export async function getReports(limit?: number): Promise<AppReport[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching reports:", error);
    return [];
  }

  return (data || []).map(dbReportToApp);
}

export async function getReportsToCheck(): Promise<AppReport[]> {
  const supabase = getSupabaseAdmin();
  
  // Get check interval from settings
  const settings = await getSettings();
  const checkIntervalMinutes = Math.max(1, Math.min(5, settings.check_interval_minutes || 2));
  const checkIntervalMs = checkIntervalMinutes * 60 * 1000;
  const intervalAgo = new Date(Date.now() - checkIntervalMs).toISOString();

  // First, get all sent reports that haven't been banned
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "sent")
    .is("banned_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reports to check:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Filter in JavaScript to ensure we check reports that need checking
  const now = Date.now();
  const reportsToCheck = data
    .filter((report) => {
      // If never checked, include it
      if (!report.last_checked) {
        return true;
      }
      // If checked more than interval ago, include it
      const lastChecked = new Date(report.last_checked).getTime();
      return (now - lastChecked) >= checkIntervalMs;
    })
    .map(dbReportToApp);

  return reportsToCheck;
}

export async function updateReportCheckTime(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("reports")
    .update({ last_checked: new Date().toISOString() })
    .eq("id", id);
}

export async function getReportById(id: string): Promise<AppReport | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return dbReportToApp(data);
}

// Settings functions
export async function getSettings(): Promise<Settings> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .single();

  if (error || !data) {
    // Return defaults if no settings exist (fallback to env vars)
    // NOTE: These env vars are only used as fallbacks. Once Settings page is configured,
    // these values are stored in Supabase and env vars are ignored.
    return {
      id: "default",
      support_emails: process.env.TELEGRAM_SUPPORT_EMAIL ? [process.env.TELEGRAM_SUPPORT_EMAIL] : ["abuse@telegram.org"],
      check_interval_minutes: Math.max(1, Math.min(5, parseInt(process.env.CHECK_INTERVAL_MINUTES || "2"))),
      telegram_chat_id: process.env.TELEGRAM_CHAT_ID || null,
      updated_at: new Date().toISOString(),
    };
  }

  return data;
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const supabase = getSupabaseAdmin();
  
  // Ensure support_emails is an array
  if (updates.support_emails && !Array.isArray(updates.support_emails)) {
    updates.support_emails = [updates.support_emails as any];
  }

  // Validate check_interval_minutes
  if (updates.check_interval_minutes !== undefined) {
    updates.check_interval_minutes = Math.max(1, Math.min(5, updates.check_interval_minutes));
  }

  const { data, error } = await supabase
    .from("settings")
    .upsert({
      id: "default",
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating settings:", error);
    throw error;
  }

  return data;
}

/**
 * Update last check run time in settings
 */
export async function updateLastCheckTime(): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("settings")
    .upsert({
      id: "default",
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "id",
    });
}

