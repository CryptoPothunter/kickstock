require("dotenv").config();

const deployment = require("../../../deployments/xlayer-testnet.json");

const config = {
  // Chain
  chainId: 195,
  rpcUrl: process.env.RPC_URL || "https://testrpc.xlayer.tech",
  confirmations: 5,
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 3000,

  // Contract addresses
  contracts: {
    MockUSDT: deployment.contracts.MockUSDT,
    PlayerTokenFactory: deployment.contracts.PlayerTokenFactory,
    PlayerMarket: deployment.contracts.PlayerMarket,
    PerformanceOracle: deployment.contracts.PerformanceOracle,
  },

  // Curve params (raw BigInt strings from deployment)
  curveBase: BigInt(deployment.params.curveBase),
  curveSlope: BigInt(deployment.params.curveSlope),

  // Database
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://kickstock:kickstock@localhost:5432/kickstock",

  // API
  apiPort: Number(process.env.API_PORT) || 4000,
};

module.exports = config;
