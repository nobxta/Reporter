"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Shield, AlertCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import DarkLayout from "@/components/dark-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/report");
      } else {
        setError(data.error || "Invalid password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DarkLayout>
      <Navbar showLogin={false} />
      
      <main className="relative pt-20">
        <Section spacing="xl">
          <Container size="sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card variant="glass" className="shadow-2xl bg-[#141414] border-gray-800/50">
                <CardHeader className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                  >
                    <Shield className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-3xl text-white">Admin Login</CardTitle>
                  <CardDescription className="text-gray-400 text-base">
                    Enter your password to access the reporting dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Password
                      </label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loading}
                        autoFocus
                        className="w-full bg-[#0a0a0a] border-gray-800 text-white"
                      />
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-red-500">{error}</p>
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? "Logging in..." : "Login"}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-2">
                      <Shield className="w-3 h-3" />
                      Private tool. Unauthorized access is not allowed.
                    </p>
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
