// @kickstock/ticker — Event monitor
// Polls X Layer Testnet for contract events with 5-block confirmation delay.

const fs = require("fs");
const path = require("path");
const { createPublicClient, http, parseAbiItem, formatUnits } = require("viem");
const { config } = require("./config");
const { postTweet } = require("./twitter");
const templates = require("./templates");

// Import ABIs from shared package
const {
  PlayerMarket_ABI,
  PlayerAMM_ABI,
  PlayerToken_ABI,
} = require("../../../packages/abi/index.js");

// Import player roster for name/country lookups
const PLAYERS = require("../../../packages/config/players.config.js");

// ---------------------------------------------------------------------------
// State persistence (simple JSON file)
// ---------------------------------------------------------------------------
const STATE_FILE = path.join(__dirname, "..", "state.json");

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { lastBlock: 0, priceSnapshots: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Player lookup helpers
// ---------------------------------------------------------------------------
const playerById = new Map();
for (const p of PLAYERS) {
  playerById.set(p.id, p);
}

function lookupPlayer(playerId) {
  const id = Number(playerId);
  return playerById.get(id) || { id, name: `Player#${id}`, code: `P${id}`, countryCode: "???" };
}

// ---------------------------------------------------------------------------
// Viem client
// ---------------------------------------------------------------------------
let client;

function getClient() {
  if (!client) {
    client = createPublicClient({
      transport: http(config.rpcUrl),
    });
  }
  return client;
}

// ---------------------------------------------------------------------------
// ABI items for event log filtering (parsed from human-readable)
// ---------------------------------------------------------------------------
const MARKET_EVENTS = {
  PlayerListed: parseAbiItem("event PlayerListed(uint256 indexed playerId, address token, string name, string symbol)"),
  Bought: parseAbiItem("event Bought(uint256 indexed playerId, address indexed buyer, uint256 amount, uint256 cost, uint256 fee, uint256 newSupply)"),
  Sold: parseAbiItem("event Sold(uint256 indexed playerId, address indexed seller, uint256 amount, uint256 proceeds, uint256 fee, uint256 newSupply)"),
  DividendDistributed: parseAbiItem("event DividendDistributed(uint256 indexed playerId, uint8 statType, uint256 amount)"),
  Graduated: parseAbiItem("event Graduated(uint256 indexed playerId, address amm, uint256 usdtSeeded, uint256 tokensSeeded)"),
};

const AMM_EVENTS = {
  Swapped: parseAbiItem("event Swapped(address indexed trader, bool usdtIn, uint256 amountIn, uint256 amountOut, uint256 fee, uint256 newReserveUsdt, uint256 newReserveToken)"),
};

// ---------------------------------------------------------------------------
// Event processing
// ---------------------------------------------------------------------------

async function processPlayerListed(log, txHash) {
  const { playerId, token, name: pName, symbol } = log.args;
  const player = lookupPlayer(playerId);
  const c = getClient();

  // Read current price from contract
  let price = 0n;
  try {
    price = await c.readContract({
      address: config.contracts.playerMarket,
      abi: [parseAbiItem("function currentPrice(uint256 playerId) view returns (uint256)")],
      functionName: "currentPrice",
      args: [playerId],
    });
  } catch { /* price read failed, use 0 */ }

  const text = templates.playerListed({
    player: player.name,
    symbol: symbol || player.code,
    countryCode: player.countryCode,
    price,
    txHash,
  });
  await postTweet(text);
}

async function processBought(log, txHash) {
  const { playerId, buyer, amount, cost, fee, newSupply } = log.args;
  const shares = Number(amount / (10n ** 18n));

  // Only tweet whale buys
  if (shares < config.whaleThreshold) return;

  const player = lookupPlayer(playerId);

  // Estimate price delta (rough: cost relative to supply change)
  const delta = shares > 0 ? ((Number(cost) / 1e6 / shares) * 100 / 100).toFixed(1) : "0";

  const text = templates.whaleBuy({
    player: player.name,
    symbol: player.code,
    shares: shares.toString(),
    cost,
    delta,
    txHash,
  });
  await postTweet(text);
}

async function processSold(log, txHash) {
  const { playerId, seller, amount, proceeds, fee, newSupply } = log.args;
  const shares = Number(amount / (10n ** 18n));

  if (shares < config.whaleThreshold) return;

  const player = lookupPlayer(playerId);

  const text = templates.whaleSell({
    player: player.name,
    symbol: player.code,
    shares: shares.toString(),
    proceeds,
    txHash,
  });
  await postTweet(text);
}

async function processDividendDistributed(log, txHash) {
  const { playerId, statType, amount } = log.args;
  const player = lookupPlayer(playerId);

  const text = templates.dividendDistributed({
    player: player.name,
    symbol: player.code,
    amount,
    statType: Number(statType),
    txHash,
  });
  await postTweet(text);
}

async function processGraduated(log, txHash) {
  const { playerId, amm, usdtSeeded, tokensSeeded } = log.args;
  const player = lookupPlayer(playerId);

  const text = templates.graduated({
    player: player.name,
    symbol: player.code,
    amm,
    usdtSeeded,
    tokensSeeded,
    txHash,
  });
  await postTweet(text);
}

async function processSwapped(log, txHash, playerSymbol) {
  const { trader, usdtIn, amountIn, amountOut, fee } = log.args;
  const inAmount = Number(amountIn / (10n ** 18n));

  // Only tweet significant swaps (whale-level)
  if (inAmount < config.whaleThreshold) return;

  const text = templates.swapped({
    trader,
    usdtIn,
    amountIn,
    amountOut,
    symbol: playerSymbol || "???",
    txHash,
  });
  await postTweet(text);
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------

async function pollEvents(state) {
  const c = getClient();

  let latestBlock;
  try {
    latestBlock = await c.getBlockNumber();
  } catch (err) {
    console.error(`[monitor] Failed to get block number: ${err.message}`);
    return state;
  }

  // Apply confirmation delay
  const safeBlock = latestBlock - BigInt(config.confirmations);
  if (safeBlock <= 0n) return state;

  const fromBlock = state.lastBlock > 0 ? BigInt(state.lastBlock) + 1n : safeBlock - 10n;
  if (fromBlock > safeBlock) return state; // nothing new

  const toBlock = safeBlock;

  // Cap range to avoid huge queries
  const maxRange = 500n;
  const effectiveTo = fromBlock + maxRange < toBlock ? fromBlock + maxRange : toBlock;

  console.log(
    `[monitor] Scanning blocks ${fromBlock} -> ${effectiveTo} (latest=${latestBlock}, safe=${safeBlock})`
  );

  try {
    // Fetch PlayerMarket events
    const marketLogs = await c.getLogs({
      address: config.contracts.playerMarket,
      events: Object.values(MARKET_EVENTS),
      fromBlock,
      toBlock: effectiveTo,
    });

    for (const log of marketLogs) {
      const txHash = log.transactionHash;
      switch (log.eventName) {
        case "PlayerListed":
          await processPlayerListed(log, txHash);
          break;
        case "Bought":
          await processBought(log, txHash);
          break;
        case "Sold":
          await processSold(log, txHash);
          break;
        case "DividendDistributed":
          await processDividendDistributed(log, txHash);
          break;
        case "Graduated":
          await processGraduated(log, txHash);
          break;
      }
    }
  } catch (err) {
    console.error(`[monitor] Error fetching market logs: ${err.message}`);
  }

  state.lastBlock = Number(effectiveTo);
  saveState(state);
  return state;
}

// ---------------------------------------------------------------------------
// Periodic tasks
// ---------------------------------------------------------------------------

async function computeTopGainers(state) {
  const c = getClient();

  try {
    const listedCount = await c.readContract({
      address: config.contracts.playerMarket,
      abi: [parseAbiItem("function listedCount() view returns (uint256)")],
      functionName: "listedCount",
    });

    const count = Number(listedCount);
    if (count === 0) return;

    // Sample up to 50 players for price comparison
    const sampleSize = Math.min(count, 50);
    const prices = [];

    for (let i = 0; i < sampleSize; i++) {
      try {
        const playerId = await c.readContract({
          address: config.contracts.playerMarket,
          abi: [parseAbiItem("function listedPlayerIds(uint256 index) view returns (uint256)")],
          functionName: "listedPlayerIds",
          args: [BigInt(i)],
        });

        const currentPrice = await c.readContract({
          address: config.contracts.playerMarket,
          abi: [parseAbiItem("function currentPrice(uint256 playerId) view returns (uint256)")],
          functionName: "currentPrice",
          args: [playerId],
        });

        const player = lookupPlayer(playerId);
        const prevPrice = state.priceSnapshots?.[String(playerId)] || 0;
        const curr = Number(currentPrice);
        const delta =
          prevPrice > 0 ? (((curr - prevPrice) / prevPrice) * 100).toFixed(1) : "0.0";

        prices.push({ playerId: String(playerId), symbol: player.code, currentPrice: curr, delta });

        // Update snapshot
        if (!state.priceSnapshots) state.priceSnapshots = {};
        state.priceSnapshots[String(playerId)] = curr;
      } catch {
        // Skip this player on error
      }
    }

    saveState(state);

    // Sort by delta descending, take top 3
    prices.sort((a, b) => parseFloat(b.delta) - parseFloat(a.delta));
    const top3 = prices.slice(0, 3);

    if (top3.length >= 3 && top3.some((p) => parseFloat(p.delta) > 0)) {
      const text = templates.topGainers({
        gainers: top3.map((p) => ({ symbol: p.symbol, delta: p.delta })),
      });
      await postTweet(text);
    }
  } catch (err) {
    console.error(`[monitor] Top gainers error: ${err.message}`);
  }
}

async function postCountdown(state) {
  const now = new Date();
  const diff = config.kickoffDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return;

  const c = getClient();

  try {
    const listedCount = await c.readContract({
      address: config.contracts.playerMarket,
      abi: [parseAbiItem("function listedCount() view returns (uint256)")],
      functionName: "listedCount",
    });

    const count = Number(listedCount);
    if (count < 3) return;

    // Find top 3 by reserve (proxy for market cap)
    const reserves = [];
    const sampleSize = Math.min(count, 50);

    for (let i = 0; i < sampleSize; i++) {
      try {
        const playerId = await c.readContract({
          address: config.contracts.playerMarket,
          abi: [parseAbiItem("function listedPlayerIds(uint256 index) view returns (uint256)")],
          functionName: "listedPlayerIds",
          args: [BigInt(i)],
        });

        const reserve = await c.readContract({
          address: config.contracts.playerMarket,
          abi: [parseAbiItem("function reserveOf(uint256 playerId) view returns (uint256)")],
          functionName: "reserveOf",
          args: [playerId],
        });

        const player = lookupPlayer(playerId);
        reserves.push({ symbol: player.code, reserve: Number(reserve) });
      } catch {
        // Skip
      }
    }

    reserves.sort((a, b) => b.reserve - a.reserve);
    const top3 = reserves.slice(0, 3);

    if (top3.length >= 3) {
      const text = templates.countdown({
        daysLeft,
        leaders: top3.map((r) => ({ symbol: r.symbol })),
      });
      await postTweet(text);
    }
  } catch (err) {
    console.error(`[monitor] Countdown error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  loadState,
  saveState,
  pollEvents,
  computeTopGainers,
  postCountdown,
  getClient,
};
