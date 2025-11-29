"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Clock, MessageSquare, X, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import DarkLayout from "@/components/dark-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

interface Settings {
  support_emails: string[];
  check_interval_minutes: number;
  telegram_chat_id: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    support_emails: ["abuse@telegram.org"],
    check_interval_minutes: 2,
    telegram_chat_id: null,
  });

  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      setError("Email cannot be empty");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setError("Invalid email format");
      return;
    }

    if (settings.support_emails.includes(newEmail.trim())) {
      setError("Email already exists");
      return;
    }

    setSettings({
      ...settings,
      support_emails: [...settings.support_emails, newEmail.trim()],
    });
    setNewEmail("");
    setError("");
  };

  const handleRemoveEmail = (email: string) => {
    if (settings.support_emails.length === 1) {
      setError("At least one support email is required");
      return;
    }

    setSettings({
      ...settings,
      support_emails: settings.support_emails.filter((e) => e !== email),
    });
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          support_emails: settings.support_emails,
          check_interval_minutes: settings.check_interval_minutes,
          telegram_chat_id: settings.telegram_chat_id || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
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
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-400">
                  Configure support emails, check interval, and Telegram notifications
                </p>
              </div>

              <Card className="bg-[#141414] border-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-2xl text-white">Application Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Support Emails */}
                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4" />
                      Support Emails
                    </Label>
                    <p className="text-xs text-gray-500 mb-4">
                      Reports will be sent to all these email addresses. Add multiple emails to send to multiple recipients.
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      {settings.support_emails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-gray-800 rounded-lg"
                        >
                          <span className="text-sm text-white font-mono">{email}</span>
                          <button
                            onClick={() => handleRemoveEmail(email)}
                            disabled={settings.support_emails.length === 1}
                            className="text-red-500 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          setError("");
                        }}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleAddEmail();
                          }
                        }}
                        className="flex-1 bg-[#0a0a0a] border-gray-800 text-white"
                      />
                      <Button
                        variant="outline"
                        onClick={handleAddEmail}
                        className="border-gray-800 text-white hover:bg-gray-900"
                      >
                        Add Email
                      </Button>
                    </div>
                  </div>

                  {/* Check Interval */}
                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      Check Interval (minutes)
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      How often to check if reported targets are banned (1-5 minutes)
                    </p>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={settings.check_interval_minutes}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1 && value <= 5) {
                          setSettings({
                            ...settings,
                            check_interval_minutes: value,
                          });
                        }
                      }}
                      className="w-32 bg-[#0a0a0a] border-gray-800 text-white"
                    />
                  </div>

                  {/* Telegram Chat ID */}
                  <div>
                    <Label className="text-white flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4" />
                      Telegram Chat ID
                    </Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Your Telegram chat ID where ban notifications will be sent. Get it from @userinfobot
                    </p>
                    <Input
                      type="text"
                      placeholder="Enter Telegram Chat ID"
                      value={settings.telegram_chat_id || ""}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          telegram_chat_id: e.target.value.trim() || null,
                        });
                      }}
                      className="bg-[#0a0a0a] border-gray-800 text-white"
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                    >
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-500">{error}</p>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <p className="text-sm text-green-500">
                        Settings saved successfully!
                      </p>
                    </motion.div>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                    size="lg"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </Container>
        </Section>
      </main>
    </DarkLayout>
  );
}
