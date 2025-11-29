"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Database,
  Mail,
  CheckCircle2,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/navbar";
import DarkLayout from "@/components/dark-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const features = [
  {
    icon: FileText,
    title: "Smart Report Generation",
    description:
      "Automatically generate professional complaint emails with structured formatting, legal references, and evidence compilation.",
    gradient: "from-red-600 to-red-500",
  },
  {
    icon: Database,
    title: "Centralized Dashboard",
    description:
      "Track all your reports in one place with real-time status updates, history, and detailed analytics.",
    gradient: "from-red-600 to-red-500",
  },
  {
    icon: Mail,
    title: "Multi-Email Delivery",
    description:
      "Send reports to multiple Telegram support addresses simultaneously with automatic retry and delivery confirmation.",
    gradient: "from-red-600 to-red-500",
  },
  {
    icon: CheckCircle2,
    title: "Auto Status Monitoring",
    description:
      "Automatically check if reported channels are banned every 1-5 minutes with instant Telegram notifications.",
    gradient: "from-red-600 to-red-500",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Password-protected access with HTTP-only cookies. Your data is encrypted and stored securely in Supabase.",
    gradient: "from-red-600 to-red-500",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Optimized performance with instant complaint generation, real-time updates, and seamless user experience.",
    gradient: "from-red-600 to-red-500",
  },
];

const stats = [
  { label: "Reports Processed", value: "100+", icon: FileText },
  { label: "Success Rate", value: "98%", icon: CheckCircle2 },
  { label: "Response Time", value: "< 24h", icon: Zap },
  { label: "Active Users", value: "50+", icon: Shield },
];

export default function Home() {
  return (
    <DarkLayout>
      <Navbar showLogin />
      
      <main className="relative pt-20">
        {/* Hero Section */}
        <Section spacing="2xl" className="relative">
          <Container>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="text-center"
            >
              <motion.div variants={itemVariants}>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight">
                  <span className="text-white">The smart way to manage</span>
                  <br />
                  <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                    Telegram abuse reports
                  </span>
                </h1>
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed"
              >
                Streamline your reporting workflow with automated complaint
                generation, multi-email delivery, and real-time status tracking.
                Make reporting scammers and illegal content effortless.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Link href="/login">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600">
                    Get started for free
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </Container>
        </Section>

        {/* Stats Section */}
        <Section spacing="lg" className="relative">
          <Container>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-[#141414] border border-gray-800/50 rounded-xl p-6 hover:border-red-500/30 transition-all"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-500 rounded-xl flex items-center justify-center mb-3 shadow-lg mx-auto">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-white mb-2">
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-400">{stat.label}</div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </Container>
        </Section>

        {/* Features Section */}
        <Section spacing="2xl" id="features" className="relative">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
                Powerful Features
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Everything you need to efficiently report and track Telegram
                violations
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <motion.div key={idx} variants={itemVariants}>
                    <Card
                      variant="glass"
                      className="group h-full hover:scale-105 transition-all duration-300 bg-[#141414] border-gray-800/50 hover:border-red-500/30"
                    >
                      <CardContent className="p-6">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg`}
                        >
                          <Icon className="w-8 h-8" />
                        </motion.div>
                        <h3 className="text-2xl font-bold mb-3 text-white">
                          {feature.title}
                        </h3>
                        <p className="text-gray-400 leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </Container>
        </Section>

        {/* CTA Section */}
        <Section spacing="2xl" className="relative">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-3xl p-12 md:p-16 text-center text-white overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Ready to Start Reporting?
                </h2>
                <p className="text-xl md:text-2xl mb-8 text-red-100 max-w-2xl mx-auto">
                  Join the fight against scammers and illegal content on Telegram
                </p>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="bg-white text-red-600 hover:bg-gray-100 gap-2"
                  >
                    Get Started Now
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </Container>
        </Section>
      </main>
    </DarkLayout>
  );
}
