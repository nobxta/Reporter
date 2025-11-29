import nodemailer from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  to: string; // Telegram support email
}

export async function sendEmail(
  config: EmailConfig,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject,
      text: body,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Email sending error:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

