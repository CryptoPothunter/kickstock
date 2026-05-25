const {
  createPublicClient,
  http,
  parseAbiItem,
  decodeEventLog,
  getAddress,
} = require("viem");

const config = require("./config");
const { pool, getLastBlock, setLastBlock } = require("./db");
const {
  PlayerMarket_ABI,
  PlayerToken_ABI,
  PerformanceOracle_ABI,
} = require("@kickstock/abi");

/* ── viem client ─────────────────────────────────────────── */

const client = createPublicClient({
  transport: http(config.rpcUrl),
});

/* ── ABI items for getLogs topics ─────────────────────────── */

const MARKET_EVENTS = PlayerMarket_ABI.filter((s) => s.startsWith("event ")).map(
  (s) => parseAbiItem(s)
);
const TOKEN_EVENTS = PlayerToken_ABI.filter((s) => s.startsWith("event ")).map(
  (s) => parseAbiItem(s)
);
const ORACLE_EVENTS = PerformanceOracle_ABI.filter((s) =>
  s.startsWith("event ")
).map((s) => parseAbiItem(s));

// Build lookup maps: eventName -> parsed ABI item
function buildEventMap(items) {
  const m = {};
  for (const item of items) m[item.name] = item;
  return m;
}
const marketEventMap = buildEventMap(MARKET_EVENTS);
const tokenEventMap = buildEventMap(TOKEN_EVENTS);
const oracleEventMap = buildEventMap(ORACLE_EVENTS);

// Full ABI arrays (for decodeEventLog)
const marketAbi = MARKET_EVENTS;
const tokenAbi = TOKEN_EVENTS;
const oracleAbi = ORACLE_EVENTS;

/* ── In-memory token address registry ────────────────────── */

// playerId -> tokenAddress (lowercase)
const tokenRegistry = {};
// tokenAddress (lowercase) -> playerId
const tokenToPlayer = {};

async function loadTokenRegistry() {
  const { rows } = await pool.query(
    "SELECT player_id, token_address FROM players"
  );
  for (const r of rows) {
    const addr = r.token_address.toLowerCase();
    tokenRegistry[r.player_id] = addr;
    tokenToPlayer[addr] = r.player_id;
  }
  console.log(`[indexer] loaded ${rows.length} tokens into registry`);
}

/* ── Price helper ─────────────────────────────────────────── */

function calcPrice(supplyBigInt) {
  // price = curveBase + curveSlope * supply (supply in token units = supply / 1e18)
  // But on-chain supply is in wei, and price is also in wei-per-token
  // On-chain: currentPrice = curveBase + (curveSlope * supply) / 1e18
  const s = BigInt(supplyBigInt);
  return config.curveBase + (config.curveSlope * s) / BigInt("1000000000000000000");
}

/* ── Event handlers ──────────────────────────────────────── */

async function handlePlayerListed(args, txHash, blockNumber) {
  const { playerId, token, name, symbol } = args;
  const pid = Number(playerId);
  const addr = token.toLowerCase();
  tokenRegistry[pid] = addr;
  tokenToPlayer[addr] = pid;

  await pool.query(
    `INSERT INTO players (player_id, token_address, name, symbol, supply, reserve, dividend_budget, price)
     VALUES ($1, $2, $3, $4, 0, 0, 0, $5)
     ON CONFLICT (player_id) DO NOTHING`,
    [pid, addr, name, symbol, config.curveBase.toString()]
  );
}

async function handleBought(args, txHash, blockNumber) {
  const { playerId, buyer, amount, cost, fee, newSupply } = args;
  const pid = Number(playerId);
  const newPrice = calcPrice(newSupply);

  const c = await pool.connect();
  try {
    await c.query("BEGIN");

    await c.query(
      `INSERT INTO trades (player_id, trader, side, shares, cost_or_proceeds, fee, new_supply, tx_hash, block_number)
       VALUES ($1, $2, 'buy', $3, $4, $5, $6, $7, $8)`,
      [pid, buyer.toLowerCase(), amount.toString(), cost.toString(), fee.toString(), newSupply.toString(), txHash, blockNumber]
    );

    await c.query(
      `UPDATE players SET supply = $1, price = $2 WHERE player_id = $3`,
      [newSupply.toString(), newPrice.toString(), pid]
    );

    await c.query(
      `INSERT INTO price_points (player_id, price, supply, block_number)
       VALUES ($1, $2, $3, $4)`,
      [pid, newPrice.toString(), newSupply.toString(), blockNumber]
    );

    // Update global stats
    await c.query(
      `UPDATE stats SET
         total_volume = total_volume + $1,
         total_trades = total_trades + 1,
         updated_at = NOW()
       WHERE id = 1`,
      [cost.toString()]
    );

    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK");
    throw err;
  } finally {
    c.release();
  }
}

async function handleSold(args, txHash, blockNumber) {
  const { playerId, seller, amount, proceeds, fee, newSupply } = args;
  const pid = Number(playerId);
  const newPrice = calcPrice(newSupply);

  const c = await pool.connect();
  try {
    await c.query("BEGIN");

    await c.query(
      `INSERT INTO trades (player_id, trader, side, shares, cost_or_proceeds, fee, new_supply, tx_hash, block_number)
       VALUES ($1, $2, 'sell', $3, $4, $5, $6, $7, $8)`,
      [pid, seller.toLowerCase(), amount.toString(), proceeds.toString(), fee.toString(), newSupply.toString(), txHash, blockNumber]
    );

    await c.query(
      `UPDATE players SET supply = $1, price = $2 WHERE player_id = $3`,
      [newSupply.toString(), newPrice.toString(), pid]
    );

    await c.query(
      `INSERT INTO price_points (player_id, price, supply, block_number)
       VALUES ($1, $2, $3, $4)`,
      [pid, newPrice.toString(), newSupply.toString(), blockNumber]
    );

    await c.query(
      `UPDATE stats SET
         total_volume = total_volume + $1,
         total_trades = total_trades + 1,
         updated_at = NOW()
       WHERE id = 1`,
      [proceeds.toString()]
    );

    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK");
    throw err;
  } finally {
    c.release();
  }
}

async function handleReferralPaid(args, txHash, blockNumber) {
  const { referrer, trader, amount } = args;
  await pool.query(
    `INSERT INTO referral_earnings (referrer, trader, amount, tx_hash, block_number)
     VALUES ($1, $2, $3, $4, $5)`,
    [referrer.toLowerCase(), trader.toLowerCase(), amount.toString(), txHash, blockNumber]
  );
}

async function handleDividendFunded(args, txHash, blockNumber) {
  const { playerId, amount } = args;
  const pid = Number(playerId);
  await pool.query(
    `UPDATE players SET dividend_budget = dividend_budget + $1 WHERE player_id = $2`,
    [amount.toString(), pid]
  );
}

async function handleDividendDistributed(args, txHash, blockNumber) {
  const { playerId, statType, amount } = args;
  const pid = Number(playerId);

  await pool.query(
    `INSERT INTO dividends (player_id, stat_type, amount, tx_hash, block_number)
     VALUES ($1, $2, $3, $4, $5)`,
    [pid, Number(statType), amount.toString(), txHash, blockNumber]
  );

  await pool.query(
    `UPDATE stats SET total_dividends = total_dividends + $1, updated_at = NOW() WHERE id = 1`,
    [amount.toString()]
  );
}

async function handleReferrerSet(args) {
  const { user, referrer } = args;
  await pool.query(
    `INSERT INTO referrals (user_address, referrer)
     VALUES ($1, $2)
     ON CONFLICT (user_address) DO UPDATE SET referrer = $2`,
    [user.toLowerCase(), referrer.toLowerCase()]
  );
}

async function handleStatPushed(args, txHash, blockNumber) {
  // StatPushed just triggers a distribute on the market, which emits
  // DividendDistributed. We can optionally log it; for now it's handled
  // via DividendDistributed.
}

async function handleDividendClaimed(args, txHash, blockNumber, tokenAddress) {
  const { account, amount } = args;
  await pool.query(
    `INSERT INTO dividend_claims (holder, token_address, amount, tx_hash, block_number)
     VALUES ($1, $2, $3, $4, $5)`,
    [account.toLowerCase(), tokenAddress.toLowerCase(), amount.toString(), txHash, blockNumber]
  );
}

async function handleTransfer(args, txHash, blockNumber, tokenAddress) {
  const { from, to, value } = args;
  const addr = tokenAddress.toLowerCase();
  const playerId = tokenToPlayer[addr];
  if (playerId == null) return; // unknown token

  const ZERO = "0x0000000000000000000000000000000000000000";
  const amt = value.toString();

  if (from.toLowerCase() !== ZERO) {
    await pool.query(
      `INSERT INTO holdings (address, player_id, balance)
       VALUES ($1, $2, 0)
       ON CONFLICT (address, player_id) DO NOTHING`,
      [from.toLowerCase(), playerId]
    );
    await pool.query(
      `UPDATE holdings SET balance = GREATEST(balance - $1, 0) WHERE address = $2 AND player_id = $3`,
      [amt, from.toLowerCase(), playerId]
    );
  }

  if (to.toLowerCase() !== ZERO) {
    await pool.query(
      `INSERT INTO holdings (address, player_id, balance)
       VALUES ($1, $2, $3)
       ON CONFLICT (address, player_id) DO UPDATE SET balance = holdings.balance + $3`,
      [to.toLowerCase(), playerId, amt]
    );
  }
}

/* ── Log processing ──────────────────────────────────────── */

function tryDecode(abi, log) {
  try {
    return decodeEventLog({ abi, data: log.data, topics: log.topics });
  } catch {
    return null;
  }
}

async function processLog(log) {
  const txHash = log.transactionHash;
  const blockNumber = Number(log.blockNumber);
  const logAddress = log.address.toLowerCase();

  // Try market events
  if (logAddress === config.contracts.PlayerMarket.toLowerCase()) {
    const decoded = tryDecode(marketAbi, log);
    if (!decoded) return;
    const args = decoded.args;

    switch (decoded.eventName) {
      case "PlayerListed":
        await handlePlayerListed(args, txHash, blockNumber);
        break;
      case "Bought":
        await handleBought(args, txHash, blockNumber);
        break;
      case "Sold":
        await handleSold(args, txHash, blockNumber);
        break;
      case "ReferralPaid":
        await handleReferralPaid(args, txHash, blockNumber);
        break;
      case "DividendFunded":
        await handleDividendFunded(args, txHash, blockNumber);
        break;
      case "DividendDistributed":
        await handleDividendDistributed(args, txHash, blockNumber);
        break;
      case "ReferrerSet":
        await handleReferrerSet(args);
        break;
    }
    return;
  }

  // Try oracle events
  if (logAddress === config.contracts.PerformanceOracle.toLowerCase()) {
    const decoded = tryDecode(oracleAbi, log);
    if (!decoded) return;
    if (decoded.eventName === "StatPushed") {
      await handleStatPushed(decoded.args, txHash, blockNumber);
    }
    return;
  }

  // Try player token events (any known token address)
  if (tokenToPlayer[logAddress] != null) {
    const decoded = tryDecode(tokenAbi, log);
    if (!decoded) return;

    switch (decoded.eventName) {
      case "DividendClaimed":
        await handleDividendClaimed(decoded.args, txHash, blockNumber, logAddress);
        break;
      case "Transfer":
        await handleTransfer(decoded.args, txHash, blockNumber, logAddress);
        break;
    }
  }
}

/* ── Main polling loop ───────────────────────────────────── */

async function pollOnce() {
  const latestBlock = Number(await client.getBlockNumber());
  const safeBlock = latestBlock - config.confirmations;
  const lastProcessed = await getLastBlock();

  if (safeBlock <= lastProcessed) return;

  // Limit batch size to avoid huge requests
  const fromBlock = BigInt(lastProcessed + 1);
  const toBlock = BigInt(Math.min(safeBlock, lastProcessed + 2000));

  // Build the set of addresses to query
  const tokenAddresses = Object.values(tokenRegistry);
  const addresses = [
    config.contracts.PlayerMarket,
    config.contracts.PerformanceOracle,
    ...tokenAddresses,
  ];

  const logs = await client.getLogs({
    address: addresses,
    fromBlock,
    toBlock,
  });

  if (logs.length > 0) {
    console.log(
      `[indexer] processing ${logs.length} logs from block ${fromBlock} to ${toBlock}`
    );
  }

  // Sort by block + logIndex to ensure ordering
  logs.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber)
      return Number(a.blockNumber) - Number(b.blockNumber);
    return Number(a.logIndex) - Number(b.logIndex);
  });

  for (const log of logs) {
    try {
      await processLog(log);
    } catch (err) {
      console.error(
        `[indexer] error processing log tx=${log.transactionHash} idx=${log.logIndex}:`,
        err.message
      );
    }
  }

  await setLastBlock(Number(toBlock));
}

async function startIndexer() {
  await loadTokenRegistry();
  console.log("[indexer] starting poll loop");

  async function loop() {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[indexer] poll error:", err.message);
    }
    setTimeout(loop, config.pollIntervalMs);
  }

  loop();
}

module.exports = { startIndexer };
