"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, RefreshCw, FileText, CheckCircle2, Clock, Ban } from "lucide-react";
import Navbar from "@/components/navbar";
import DarkLayout from "@/components/dark-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { AppReport } from "@/lib/storage-supabase";
type Report = AppReport;

const violationOptions = [
  { value: "scam", label: "Scam / Fraud" },
  { value: "illegal", label: "Illegal content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "spam", label: "Spam / Malware" },
  { value: "other", label: "Other" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" }> = {
  pending: { label: "Pending", variant: "warning" },
  sent: { label: "Sent", variant: "default" },
  banned: { label: "Banned", variant: "success" },
};

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch("/api/reports");
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setReports(data.reports || []);
        }
      } catch (err) {
        console.error("Error loading reports:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [router]);

  const handleMarkBanned = async (reportId: string) => {
    if (!confirm("Mark this report as banned? This will send a notification to your Telegram bot.")) {
      return;
    }

    try {
      const response = await fetch("/api/send-report", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reportId }),
      });

      if (response.ok) {
        const reportsResponse = await fetch("/api/reports");
        if (reportsResponse.ok) {
          const reportsData = await reportsResponse.json();
          setReports(reportsData.reports || []);
          setSelectedReport(null);
        }
      } else {
        alert("Failed to update report status");
      }
    } catch (err) {
      alert("Network error. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <DarkLayout>
        <Navbar showLogout showHistory showSettings />
        <main className="relative pt-20">
          <Section spacing="xl">
            <Container>
              <div className="text-center">
                <p className="text-gray-400">Loading...</p>
              </div>
            </Container>
          </Section>
        </main>
      </DarkLayout>
    );
  }

  return (
    <DarkLayout>
      <Navbar showLogout showHistory showSettings />
      <main className="relative pt-20">
        <Section spacing="lg">
          <Container>
            <div className="mb-8 flex justify-between items-center">
              <h1 className="text-4xl font-bold text-white">Report History</h1>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={async () => {
                    setChecking(true);
                    try {
                      const response = await fetch("/api/check-reports-manual", {
                        method: "POST",
                      });
                      const data = await response.json();
                      if (response.ok) {
                        alert(`Checked ${data.checked} reports. ${data.banned} were banned.`);
                        const reportsResponse = await fetch("/api/reports");
                        if (reportsResponse.ok) {
                          const reportsData = await reportsResponse.json();
                          setReports(reportsData.reports || []);
                        }
                      } else {
                        alert(`Error: ${data.error}`);
                      }
                    } catch (err) {
                      alert("Network error. Please try again.");
                    } finally {
                      setChecking(false);
                    }
                  }}
                  disabled={checking}
                  className="border-gray-800 text-white hover:bg-gray-900"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                  {checking ? "Checking..." : "Check Now"}
                </Button>
                <Button
                  onClick={() => router.push("/report")}
                  className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                >
                  New Report
                </Button>
              </div>
            </div>

            {reports.length === 0 ? (
              <Card className="bg-[#141414] border-gray-800/50">
                <CardContent className="py-12">
                  <p className="text-gray-400 text-center">
                    No reports yet. Create your first report to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    className="cursor-pointer"
                    onClick={() => setSelectedReport(report)}
                  >
                    <Card className="bg-[#141414] border-gray-800/50 hover:border-red-500/30 transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-white font-mono">
                                {report.target}
                              </h3>
                              <Badge variant={statusConfig[report.status]?.variant || "default"}>
                                {statusConfig[report.status]?.label || report.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-400 mb-2">
                              <span className="font-medium text-gray-300">Violation:</span>{" "}
                              {violationOptions.find((opt) => opt.value === report.violationType)?.label || report.violationType}
                            </p>
                            <p className="text-sm text-gray-300 mb-4">
                              {report.description.length > 150
                                ? `${report.description.substring(0, 150)}...`
                                : report.description}
                            </p>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Created: {formatDate(report.createdAt)}
                              </span>
                              {report.emailSentAt && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  Sent: {formatDate(report.emailSentAt)}
                                </span>
                              )}
                              {report.lastChecked && report.status === "sent" && (
                                <span className="flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3" />
                                  Last checked: {formatDate(report.lastChecked)}
                                </span>
                              )}
                              {report.bannedAt && (
                                <span className="flex items-center gap-1 text-green-400">
                                  <Ban className="w-3 h-3" />
                                  Banned: {formatDate(report.bannedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          {report.status === "sent" && (
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkBanned(report.id);
                              }}
                              className="ml-4 border-gray-800 text-white hover:bg-gray-900"
                            >
                              Mark as Banned
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Report Detail Modal */}
            {selectedReport && (
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setSelectedReport(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-[#141414] border border-gray-800 rounded-2xl p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold text-white">Report Details</h2>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Target</label>
                      <p className="mt-1 text-white font-mono text-lg">{selectedReport.target}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-400">Violation Type</label>
                      <p className="mt-1 text-white">
                        {violationOptions.find((opt) => opt.value === selectedReport.violationType)?.label || selectedReport.violationType}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-400">Description</label>
                      <p className="mt-1 text-gray-300 whitespace-pre-wrap">{selectedReport.description}</p>
                    </div>

                    {selectedReport.evidence && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Evidence</label>
                        <p className="mt-1 text-gray-300 whitespace-pre-wrap">{selectedReport.evidence}</p>
                      </div>
                    )}

                    {selectedReport.notes && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Additional Notes</label>
                        <p className="mt-1 text-gray-300 whitespace-pre-wrap">{selectedReport.notes}</p>
                      </div>
                    )}

                    {selectedReport.complaintSubject && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Email Subject</label>
                        <p className="mt-1 text-white">{selectedReport.complaintSubject}</p>
                      </div>
                    )}

                    {selectedReport.complaintBody && (
                      <div>
                        <label className="text-sm font-medium text-gray-400">Email Body</label>
                        <pre className="mt-2 text-sm text-gray-300 whitespace-pre-wrap font-mono bg-[#0a0a0a] border border-gray-800 p-4 rounded-lg">
                          {selectedReport.complaintBody}
                        </pre>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t border-gray-800">
                      <Badge variant={statusConfig[selectedReport.status]?.variant || "default"}>
                        Status: {statusConfig[selectedReport.status]?.label || selectedReport.status.toUpperCase()}
                      </Badge>
                      {selectedReport.status === "sent" && (
                        <Button
                          onClick={() => {
                            handleMarkBanned(selectedReport.id);
                          }}
                          className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                        >
                          Mark as Banned
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </Container>
        </Section>
      </main>
    </DarkLayout>
  );
}
