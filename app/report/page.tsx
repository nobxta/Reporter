"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, Send } from "lucide-react";
import Navbar from "@/components/navbar";
import DarkLayout from "@/components/dark-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import StepIndicator from "@/components/ui/step-indicator";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import type { AppReport } from "@/lib/storage-supabase";
type Report = AppReport;

const STEPS = [
  "Target",
  "Violation Type",
  "Description",
  "Evidence",
  "Review & Send",
];

const violationOptions = [
  { value: "scam", label: "Scam / Fraud" },
  { value: "illegal", label: "Illegal content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "spam", label: "Spam / Malware" },
  { value: "other", label: "Other" },
];

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    target: "",
    violationType: "",
    description: "",
    evidence: "",
    notes: "",
  });

  const [generatedComplaint, setGeneratedComplaint] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [editableSubject, setEditableSubject] = useState("");
  const [editableBody, setEditableBody] = useState("");
  const [reportDataForSave, setReportDataForSave] = useState<{
    target: string;
    violationType: string;
    description: string;
    evidence: string;
    notes: string;
  } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/reports?limit=1");
        if (response.status === 401) {
          router.push("/login");
          return;
        }
      } catch (err) {
        console.error("Error checking auth:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.target.trim()) {
          setError("Target username or channel link is required");
          return false;
        }
        break;
      case 2:
        if (!formData.violationType) {
          setError("Type of violation is required");
          return false;
        }
        break;
      case 3:
        if (!formData.description.trim()) {
          setError("Description is required");
          return false;
        }
        break;
    }
    setError("");
    return true;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep === 4) {
      try {
        setSubmitting(true);
        setError("");

        const response = await fetch("/api/report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (response.ok) {
          const complaint = {
            subject: data.complaint.subject,
            body: data.complaint.body,
          };
          setGeneratedComplaint(complaint);
          setEditableSubject(complaint.subject);
          setEditableBody(complaint.body);
          setReportDataForSave(data.reportData);
          setCurrentStep(5);
        } else {
          setError(data.error || "Failed to generate complaint");
        }
      } catch (err) {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const handleSend = async () => {
    if (!reportDataForSave) {
      setError("Report data missing");
      return;
    }

    if (!editableSubject.trim() || !editableBody.trim()) {
      setError("Subject and body cannot be empty");
      return;
    }

    setSending(true);
    setError("");

    try {
      const saveResponse = await fetch("/api/report/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...reportDataForSave,
          complaintSubject: editableSubject.trim(),
          complaintBody: editableBody.trim(),
        }),
      });

      if (!saveResponse.ok) {
        const saveData = await saveResponse.json();
        setError(saveData.error || "Failed to save report");
        setSending(false);
        return;
      }

      const saveResult = await saveResponse.json();
      const reportId = saveResult.report.id;

      // Reset progress
      setSendingProgress(["Processing..."]);

      // Use streaming endpoint for progress updates
      const response = await fetch("/api/send-report/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reportId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send report");
        setSending(false);
        setSendingProgress([]);
        return;
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setError("Failed to read response stream");
        setSending(false);
        setSendingProgress([]);
        return;
      }

      let buffer = "";
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "processing") {
                setSendingProgress([data.message]);
              } else if (data.type === "sending") {
                setSendingProgress((prev) => {
                  const newProgress = [...prev];
                  if (newProgress[0] === "Processing...") {
                    newProgress[0] = `Sending to ${data.email} (${data.index}/${data.total})...`;
                  } else {
                    newProgress[0] = `Sending to ${data.email} (${data.index}/${data.total})...`;
                  }
                  return newProgress;
                });
              } else if (data.type === "sent") {
                setSendingProgress((prev) => {
                  const newProgress = [...prev];
                  if (newProgress[0].includes("Sending to")) {
                    newProgress[0] = data.message;
                  } else {
                    newProgress.push(data.message);
                  }
                  return newProgress;
                });
              } else if (data.type === "error") {
                setSendingProgress((prev) => {
                  const newProgress = [...prev];
                  if (newProgress[0].includes("Sending to")) {
                    newProgress[0] = data.message;
                  } else {
                    newProgress.push(data.message);
                  }
                  return newProgress;
                });
              } else if (data.type === "completed") {
                setSuccess(true);
                completed = true;
                setSending(false);
                setSendingProgress((prev) => [...prev, "✓ All emails sent successfully!"]);
                setTimeout(() => {
                  setFormData({
                    target: "",
                    violationType: "",
                    description: "",
                    evidence: "",
                    notes: "",
                  });
                  setGeneratedComplaint(null);
                  setEditableSubject("");
                  setEditableBody("");
                  setReportDataForSave(null);
                  setCurrentStep(1);
                  setSuccess(false);
                  setSendingProgress([]);
                }, 3000);
              } else if (data.type === "failed") {
                setError(data.message);
                setSending(false);
                setSendingProgress([]);
              }
            } catch (err) {
              console.error("Error parsing SSE data:", err);
            }
          }
        }
      }

      if (!completed) {
        setError("Failed to complete sending process");
        setSending(false);
        setSendingProgress([]);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
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
          <Container size="lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card variant="glass" className="shadow-2xl bg-[#141414] border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-3xl flex items-center gap-3 text-white">
                    <FileText className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent" />
                    Create Telegram Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StepIndicator steps={STEPS} currentStep={currentStep} />

                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                      >
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-500">{error}</p>
                      </motion.div>
                    )}

                    {sending && sendingProgress.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-blue-400">Sending emails...</p>
                        </div>
                        <div className="space-y-1 ml-7">
                          {sendingProgress.map((progress, idx) => (
                            <motion.p
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-xs text-gray-300"
                            >
                              {progress}
                            </motion.p>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {success && !sending && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6 flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-500">
                          Report sent successfully! Email has been sent to Telegram support.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                      <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label className="text-white">Target usernames or channel links</Label>
                          <Textarea
                            placeholder="Enter one or more targets (one per line or comma-separated):&#10;@username&#10;https://t.me/channel&#10;https://t.me/another_channel"
                            value={formData.target}
                            onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                            required
                            rows={6}
                            autoFocus
                            className="bg-[#0a0a0a] border-gray-800 text-white"
                          />
                          <p className="text-xs text-gray-500">
                            You can add multiple targets. Separate them by new lines or commas.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 2 && (
                      <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label className="text-white">Type of violation</Label>
                          <Select
                            value={formData.violationType}
                            onChange={(e) => setFormData({ ...formData, violationType: e.target.value })}
                            required
                            className="bg-[#0a0a0a] border-gray-800 text-white"
                          >
                            <option value="">Select an option</option>
                            {violationOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 3 && (
                      <motion.div
                        key="step3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label className="text-white">Full Report Text</Label>
                          <Textarea
                            placeholder="Provide a complete explanation including:&#10;- Type of crime/violation&#10;- Laws violated (e.g., IPC 420, IT Act 66C)&#10;- Impact on users/public safety&#10;- Any other relevant details"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            rows={8}
                            className="bg-[#0a0a0a] border-gray-800 text-white"
                          />
                          <p className="text-xs text-gray-500">
                            Include all relevant details. Legal references and impact will be automatically extracted.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 4 && (
                      <motion.div
                        key="step4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        <div className="space-y-2">
                          <Label className="text-white">Evidence Links</Label>
                          <Textarea
                            placeholder="Enter evidence links (one per line or comma-separated):&#10;https://t.me/channel/123&#10;https://t.me/channel/456&#10;&#10;Or type 'none' if no evidence available."
                            value={formData.evidence}
                            onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                            rows={6}
                            className="bg-[#0a0a0a] border-gray-800 text-white"
                          />
                          <p className="text-xs text-gray-500">
                            Add message links, screenshot links, or other evidence. Type "none" if unavailable.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">Additional Notes (Optional)</Label>
                          <Textarea
                            placeholder="Any additional information that should be included in the report text"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={4}
                            className="bg-[#0a0a0a] border-gray-800 text-white"
                          />
                          <p className="text-xs text-gray-500">
                            Additional notes will be combined with the report text.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {currentStep === 5 && generatedComplaint && (
                      <motion.div
                        key="step5"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-6 space-y-6">
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-white">
                              <FileText className="w-4 h-4" />
                              Email Subject (Editable)
                            </Label>
                            <Input
                              value={editableSubject}
                              onChange={(e) => setEditableSubject(e.target.value)}
                              placeholder="Enter email subject"
                              className="font-medium bg-[#0a0a0a] border-gray-800 text-white"
                            />
                            <p className="text-xs text-gray-500">
                              You can edit the subject before sending
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white">Email Body (Editable)</Label>
                            <Textarea
                              value={editableBody}
                              onChange={(e) => setEditableBody(e.target.value)}
                              placeholder="Enter email body"
                              rows={15}
                              className="font-mono text-sm bg-[#0a0a0a] border-gray-800 text-white"
                            />
                            <p className="text-xs text-gray-500">
                              You can edit the email body before sending
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 1 || submitting || sending}
                      className="gap-2 border-gray-800 text-white hover:bg-gray-900"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <div className="flex gap-3">
                      {currentStep < 5 ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                          disabled={submitting}
                          className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                        >
                          {submitting ? "Generating..." : currentStep === 4 ? "Generate Complaint" : "Next"}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleSend}
                          disabled={sending}
                          className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                        >
                          {sending ? "Sending..." : "Send Report"}
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Container>
        </Section>
      </main>
    </DarkLayout>
  );
}
