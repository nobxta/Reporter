// Database types matching Supabase schema

export type ReportStatus = "pending" | "sent" | "banned";

export interface Report {
  id: string;
  target: string;
  violation_type: string;
  description: string;
  evidence: string;
  notes: string;
  status: ReportStatus;
  complaint_subject: string | null;
  complaint_body: string | null;
  email_sent_at: string | null;
  banned_at: string | null;
  last_checked: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  support_emails: string[]; // Array of email addresses
  check_interval_minutes: number; // 1-5
  telegram_chat_id: string | null;
  notify_on_no_ban: boolean; // Whether to notify when no bans found
  updated_at: string;
}

// Helper to convert database report to app format
export function dbReportToApp(report: Report) {
  return {
    id: report.id,
    target: report.target,
    violationType: report.violation_type,
    description: report.description,
    evidence: report.evidence,
    notes: report.notes,
    status: report.status,
    complaintSubject: report.complaint_subject || undefined,
    complaintBody: report.complaint_body || undefined,
    emailSentAt: report.email_sent_at || undefined,
    bannedAt: report.banned_at || undefined,
    lastChecked: report.last_checked || undefined,
    createdAt: report.created_at,
  };
}

// Helper to convert app report format to database
export function appReportToDb(report: {
  target: string;
  violationType: string;
  description: string;
  evidence: string;
  notes: string;
  complaintSubject?: string;
  complaintBody?: string;
}) {
  return {
    target: report.target,
    violation_type: report.violationType,
    description: report.description,
    evidence: report.evidence,
    notes: report.notes,
    complaint_subject: report.complaintSubject || null,
    complaint_body: report.complaintBody || null,
    status: "pending" as ReportStatus,
  };
}

