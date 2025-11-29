/**
 * Simple in-memory cron scheduler for development
 * In production, use Vercel Cron, a proper cron service, or a background worker
 */

let cronInterval: NodeJS.Timeout | null = null;

export function startCronJob(
  checkInterval?: number, // Will use CHECK_INTERVAL_MINUTES from env if not provided
  apiUrl: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
) {
  // Get interval from env (1-5 minutes), default to 2 minutes
  const intervalMinutes = Math.max(1, Math.min(5, parseInt(process.env.CHECK_INTERVAL_MINUTES || "2")));
  const intervalMs = checkInterval || (intervalMinutes * 60 * 1000);
  if (cronInterval) {
    console.log("Cron job already running");
    return;
  }

  const cronSecret = process.env.CRON_SECRET || "dev-secret";

  const runCheck = async () => {
    try {
      console.log(`[Cron] Running report check at ${new Date().toISOString()}`);
      
      const response = await fetch(`${apiUrl}/api/check-reports`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Cron] Check completed:`, data);
      } else {
        console.error(`[Cron] Check failed:`, await response.text());
      }
    } catch (error) {
      console.error("[Cron] Error running check:", error);
    }
  };

  // Run immediately on start (optional)
  // runCheck();

  // Then run at configured interval
  cronInterval = setInterval(runCheck, intervalMs);
  console.log(`[Cron] Started report checker (interval: ${intervalMinutes} minutes / ${intervalMs}ms)`);
}

export function stopCronJob() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log("[Cron] Stopped report checker");
  }
}

