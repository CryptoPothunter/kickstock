// @kickstock/ticker — Main entry point
// Starts the event monitor polling loop with periodic tasks.

const { config, validate } = require("./config");
const { loadState, pollEvents, computeTopGainers, postCountdown } = require("./monitor");

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------
let pollTimer = null;
let gainersTimer = null;
let countdownTimer = null;
let shuttingDown = false;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Validate config
  validate();

  console.log("=".repeat(60));
  console.log("  KickStock Ticker Bot");
  console.log("=".repeat(60));
  console.log(`  DRY_RUN        : ${config.dryRun}`);
  console.log(`  RPC            : ${config.rpcUrl}`);
  console.log(`  Chain ID       : ${config.chainId}`);
  console.log(`  Confirmations  : ${config.confirmations}`);
  console.log(`  Rate limit     : ${config.rateLimit.maxTweets} tweets / 15 min`);
  console.log(`  Poll interval  : ${config.pollIntervalMs}ms`);
  console.log(`  Whale threshold: ${config.whaleThreshold} shares`);
  console.log(`  PlayerMarket   : ${config.contracts.playerMarket}`);
  console.log(`  DeepSeek       : ${config.deepseekApiKey ? "configured" : "not configured"}`);
  console.log("=".repeat(60));

  const state = loadState();
  console.log(`[startup] Resuming from block ${state.lastBlock || "latest"}`);

  // --- Event polling loop ---
  async function poll() {
    if (shuttingDown) return;
    try {
      await pollEvents(state);
    } catch (err) {
      console.error(`[poll] Unhandled error: ${err.message}`);
    }
    if (!shuttingDown) {
      pollTimer = setTimeout(poll, config.pollIntervalMs);
    }
  }

  // --- Top gainers (every 6 hours) ---
  const GAINERS_INTERVAL = 6 * 60 * 60 * 1000;
  async function gainersLoop() {
    if (shuttingDown) return;
    try {
      await computeTopGainers(state);
    } catch (err) {
      console.error(`[gainers] Unhandled error: ${err.message}`);
    }
    if (!shuttingDown) {
      gainersTimer = setTimeout(gainersLoop, GAINERS_INTERVAL);
    }
  }

  // --- Countdown (daily at ~08:00 UTC) ---
  function scheduleCountdown() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(8, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    console.log(
      `[startup] Next countdown tweet in ${Math.round(delay / 1000 / 60)} minutes`
    );
    countdownTimer = setTimeout(async function countdownLoop() {
      if (shuttingDown) return;
      try {
        await postCountdown(state);
      } catch (err) {
        console.error(`[countdown] Unhandled error: ${err.message}`);
      }
      if (!shuttingDown) {
        countdownTimer = setTimeout(countdownLoop, 24 * 60 * 60 * 1000);
      }
    }, delay);
  }

  // Start all loops
  poll();
  setTimeout(gainersLoop, 60 * 1000); // first gainers check 1 min after startup
  scheduleCountdown();

  console.log("[startup] Ticker bot is running. Press Ctrl+C to stop.");
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[shutdown] Received ${signal}, shutting down gracefully...`);
  clearTimeout(pollTimer);
  clearTimeout(gainersTimer);
  clearTimeout(countdownTimer);
  console.log("[shutdown] Bye.");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error(`[fatal] ${err.message}`);
  process.exit(1);
});
