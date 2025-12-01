// Database types matching Supabase schema

export type ReportStatus = "pending" | "sent" | "banned";
export type TargetType = "link" | "username";
export type EntityType = "channel" | "group" | "account";

export interface Report {
  id: string;
  target: string;
  target_type: TargetType | null;
  entity_type: EntityType | null;
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
  checker_bot_tokens: string[]; // Array of bot tokens for checking status (MTProto)
  updated_at: string;
}

// Helper to convert database report to app format
export function dbReportToApp(report: Report) {
  return {
    id: report.id,
    target: report.target,
    targetType: report.target_type || "username",
    entityType: report.entity_type || "account",
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
  targetType?: TargetType;
  entityType?: EntityType;
  violationType: string;
  description: string;
  evidence: string;
  notes: string;
  complaintSubject?: string;
  complaintBody?: string;
}) {
  // Infer target_type from target if not provided
  const targetType: TargetType = report.targetType || 
    (report.target.includes("t.me/") || report.target.startsWith("http") ? "link" : "username");
  
  return {
    target: report.target,
    target_type: targetType,
    entity_type: report.entityType || "account",
    violation_type: report.violationType,
    description: report.description,
    evidence: report.evidence,
    notes: report.notes,
    complaint_subject: report.complaintSubject || null,
    complaint_body: report.complaintBody || null,
    status: "pending" as ReportStatus,
  };
}

