// In-memory storage for reports (will reset on server restart)
// In production, replace this with a proper database

export type ReportStatus = "pending" | "sent" | "banned";

export interface Report {
  id: string;
  target: string;
  violationType: string;
  description: string;
  evidence: string;
  notes: string;
  status: ReportStatus;
  complaintSubject?: string;
  complaintBody?: string;
  emailSentAt?: string;
  bannedAt?: string;
  lastChecked?: string;
  createdAt: string;
}

const reports: Report[] = [];

export function addReport(report: Omit<Report, "id" | "createdAt" | "status">): Report {
  const newReport: Report = {
    ...report,
    id: Date.now().toString(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  reports.push(newReport);
  return newReport;
}

export function updateReportStatus(id: string, status: ReportStatus, additionalData?: Partial<Report>): Report | null {
  const report = reports.find((r) => r.id === id);
  if (!report) return null;
  
  report.status = status;
  if (status === "sent" && !report.emailSentAt) {
    report.emailSentAt = new Date().toISOString();
  }
  if (status === "banned" && !report.bannedAt) {
    report.bannedAt = new Date().toISOString();
  }
  if (additionalData) {
    Object.assign(report, additionalData);
  }
  return report;
}

export function getReports(limit?: number): Report[] {
  const sorted = [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

export function getReportsToCheck(): Report[] {
  // Get reports that are sent but not yet banned
  // and haven't been checked within the configured interval
  // Default to 2 minutes if not configured, but allow 1-5 minutes
  const checkIntervalMinutes = Math.max(1, Math.min(5, parseInt(process.env.CHECK_INTERVAL_MINUTES || "2")));
  const checkIntervalMs = checkIntervalMinutes * 60 * 1000;
  const intervalAgo = new Date(Date.now() - checkIntervalMs).toISOString();
  
  return reports.filter(
    (r) =>
      r.status === "sent" &&
      (!r.lastChecked || r.lastChecked < intervalAgo) &&
      !r.bannedAt
  );
}

export function updateReportCheckTime(id: string): void {
  const report = reports.find((r) => r.id === id);
  if (report) {
    report.lastChecked = new Date().toISOString();
  }
}

export function getReportById(id: string): Report | undefined {
  return reports.find((r) => r.id === id);
}

