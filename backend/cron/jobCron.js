/**
 * Job Fetcher CRON Job
 * =====================
 * Runs every 6 hours to refresh tech job listings from external APIs.
 * 
 * Schedule: every 6 hours (0 *\/6 * * *)
 * APIs: Adzuna, The Muse, Jooble
 */

const cron = require("node-cron");
const { runJobIngestion } = require("../services/jobDataService");

let isRunning = false;

// Run immediately on server startup to populate DB on first launch
async function runOnce() {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log("🚀 [CRON] Running initial job ingestion on startup...");
    const result = await runJobIngestion();
    console.log(`✅ [CRON] Startup ingestion complete:`, result);
  } catch (err) {
    console.error("❌ [CRON] Startup ingestion failed:", err.message);
  } finally {
    isRunning = false;
  }
}

// Schedule: every 6 hours
function startJobCron() {
  // Run once immediately (after 5s delay to allow DB connection)
  setTimeout(runOnce, 5000);

  // Then run every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    if (isRunning) {
      console.log("[CRON] Skipping — previous ingestion still running");
      return;
    }
    isRunning = true;
    console.log("🔄 [CRON] Scheduled 6-hour job ingestion starting...");
    try {
      const result = await runJobIngestion();
      console.log("✅ [CRON] 6-hour ingestion complete:", result);
    } catch (err) {
      console.error("❌ [CRON] Scheduled ingestion error:", err.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("⏰ [CRON] Job fetcher scheduled: every 6 hours");
}

module.exports = { startJobCron, runOnce };
