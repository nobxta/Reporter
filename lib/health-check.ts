import { Telegraf } from "telegraf";
import nodemailer from "nodemailer";

export interface HealthCheckResult {
  name: string;
  status: "ok" | "error";
  message: string;
  responseTime?: number;
}

/**
 * Check Telegram API health by making a lightweight call
 */
export async function checkTelegramAPI(botToken: string): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const bot = new Telegraf(botToken);
    // Use getMe as it's the lightest API call
    await bot.telegram.getMe();
    const responseTime = Date.now() - startTime;
    return {
      name: "Telegram API",
      status: "ok",
      message: "Connected",
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name: "Telegram API",
      status: "error",
      message: error.message || "Connection failed",
      responseTime,
    };
  }
}

/**
 * Check email service health by validating configuration
 */
export async function checkEmailService(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const hasConfig =
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD;

    if (!hasConfig) {
      return {
        name: "Email Service",
        status: "error",
        message: "SMTP configuration missing",
        responseTime: Date.now() - startTime,
      };
    }

    // Try to create a transporter (lightweight check)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify connection (async, but we'll timeout quickly)
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 3000)
      ),
    ]);

    return {
      name: "Email Service",
      status: "ok",
      message: "Configured and reachable",
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Email Service",
      status: "error",
      message: error.message || "Configuration error",
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check database connectivity
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  try {
    const { getSupabaseAdmin } = await import("./supabase");
    const supabase = getSupabaseAdmin();
    
    // Simple query to check connectivity
    const { error } = await supabase.from("settings").select("id").limit(1);
    
    if (error) {
      return {
        name: "Database",
        status: "error",
        message: error.message || "Connection failed",
        responseTime: Date.now() - startTime,
      };
    }

    return {
      name: "Database",
      status: "ok",
      message: "Connected",
      responseTime: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      name: "Database",
      status: "error",
      message: error.message || "Connection failed",
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Measure ping time to Telegram API
 */
export async function measurePing(botToken: string): Promise<number> {
  const startTime = Date.now();
  try {
    const bot = new Telegraf(botToken);
    await bot.telegram.getMe();
    return Date.now() - startTime;
  } catch {
    return -1;
  }
}

/**
 * Run all health checks
 */
export async function runAllHealthChecks(botToken: string): Promise<{
  botStatus: "ok" | "error";
  ping: number;
  checks: HealthCheckResult[];
  overallStatus: "ok" | "error";
}> {
  const checks: HealthCheckResult[] = [];
  
  // Check Telegram API (also used for ping)
  const telegramCheck = await checkTelegramAPI(botToken);
  checks.push(telegramCheck);
  const ping = telegramCheck.responseTime || -1;

  // Check Database
  const dbCheck = await checkDatabase();
  checks.push(dbCheck);

  // Check Email Service
  const emailCheck = await checkEmailService();
  checks.push(emailCheck);

  // Determine overall status
  const overallStatus = checks.every((c) => c.status === "ok") ? "ok" : "error";
  const botStatus = telegramCheck.status;

  return {
    botStatus,
    ping,
    checks,
    overallStatus,
  };
}

