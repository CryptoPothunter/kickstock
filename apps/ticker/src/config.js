// @kickstock/ticker — Configuration
// Loads environment variables with sensible defaults for safe operation.

const deployment = require("../../../deployments/xlayer-testnet.json");

const config = {
  // --- Twitter OAuth 1.0a ---
  twitter: {
    apiKey: process.env.X_API_KEY || "",
    apiSecret: process.env.X_API_SECRET || "",
    accessToken: process.env.X_ACCESS_TOKEN || "",
    accessSecret: process.env.X_ACCESS_SECRET || "",
  },

  // --- Safety ---
  dryRun: (process.env.DRY_RUN ?? "true") === "true",

  // --- Blockchain ---
  rpcUrl: process.env.RPC_URL || "https://testrpc.xlayer.tech",
  chainId: deployment.chainId, // 195
  confirmations: parseInt(process.env.CONFIRMATIONS ?? "5", 10),

  // --- Contract addresses ---
  contracts: {
    mockUSDT: deployment.contracts.MockUSDT,
    playerTokenFactory: deployment.contracts.PlayerTokenFactory,
    playerMarket: deployment.contracts.PlayerMarket,
    performanceOracle: deployment.contracts.PerformanceOracle,
  },

  // --- Rate limiting ---
  rateLimit: {
    maxTweets: parseInt(process.env.RATE_LIMIT_MAX ?? "10", 10),
    windowMs: 15 * 60 * 1000, // 15 minutes
  },

  // --- Polling ---
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? "12000", 10), // 12s
  whaleThreshold: parseInt(process.env.WHALE_THRESHOLD ?? "50", 10), // shares

  // --- DeepSeek (optional, for enhanced tweet generation) ---
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",

  // --- Countdown target ---
  kickoffDate: new Date("2026-06-11T00:00:00Z"),

  // --- Explorer ---
  explorerTxUrl: "https://www.oklink.com/xlayer-test/tx/",
  explorerBlockUrl: "https://www.oklink.com/xlayer-test/block/",
};

// Validate that Twitter creds exist when not in dry-run mode
function validate() {
  if (config.dryRun) return;
  const { apiKey, apiSecret, accessToken, accessSecret } = config.twitter;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error(
      "Twitter OAuth1.0a credentials required when DRY_RUN=false. " +
        "Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET."
    );
  }
}

module.exports = { config, validate };
