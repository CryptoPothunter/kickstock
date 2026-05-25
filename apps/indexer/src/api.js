const express = require("express");
const cors = require("cors");
const { pool } = require("./db");
const config = require("./config");

const app = express();
app.use(cors());
app.use(express.json());

/* ── Health ──────────────────────────────────────────────── */

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

/* ── Market ──────────────────────────────────────────────── */

app.get("/api/market", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        p.player_id,
        p.token_address,
        p.name,
        p.symbol,
        p.supply,
        p.reserve,
        p.price,
        p.dividend_budget,
        p.graduated,
        COALESCE(t.volume, '0') AS volume,
        COALESCE(t.trade_count, 0) AS trade_count
      FROM players p
      LEFT JOIN (
        SELECT player_id,
               SUM(cost_or_proceeds) AS volume,
               COUNT(*) AS trade_count
        FROM trades
        GROUP BY player_id
      ) t ON t.player_id = p.player_id
      ORDER BY p.player_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Player detail ───────────────────────────────────────── */

app.get("/api/player/:id", async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const { rows } = await pool.query(
      `SELECT
         p.*,
         COALESCE(t.volume, '0') AS volume,
         COALESCE(t.trade_count, 0) AS trade_count
       FROM players p
       LEFT JOIN (
         SELECT player_id,
                SUM(cost_or_proceeds) AS volume,
                COUNT(*) AS trade_count
         FROM trades
         GROUP BY player_id
       ) t ON t.player_id = p.player_id
       WHERE p.player_id = $1`,
      [pid]
    );
    if (rows.length === 0) return res.status(404).json({ error: "player not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Trades ──────────────────────────────────────────────── */

app.get("/api/player/:id/trades", async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const { rows } = await pool.query(
      `SELECT * FROM trades
       WHERE player_id = $1
       ORDER BY block_number DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [pid, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Price history ───────────────────────────────────────── */

app.get("/api/player/:id/price", async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const { rows } = await pool.query(
      `SELECT * FROM price_points
       WHERE player_id = $1
       ORDER BY block_number ASC
       LIMIT $2`,
      [pid, limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Dividends ───────────────────────────────────────────── */

app.get("/api/player/:id/dividends", async (req, res) => {
  try {
    const pid = Number(req.params.id);
    const { rows } = await pool.query(
      `SELECT * FROM dividends
       WHERE player_id = $1
       ORDER BY block_number DESC
       LIMIT 100`,
      [pid]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Portfolio ───────────────────────────────────────────── */

app.get("/api/portfolio/:address", async (req, res) => {
  try {
    const addr = req.params.address.toLowerCase();
    const { rows } = await pool.query(
      `SELECT
         h.player_id,
         h.balance,
         p.name,
         p.symbol,
         p.price,
         p.token_address
       FROM holdings h
       JOIN players p ON p.player_id = h.player_id
       WHERE h.address = $1 AND h.balance > 0
       ORDER BY h.balance DESC`,
      [addr]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Leaderboard ─────────────────────────────────────────── */

app.get("/api/leaderboard", async (req, res) => {
  try {
    const type = req.query.type || "mcap";

    switch (type) {
      /* ── Top 50 by market cap (supply * price) ── */
      case "mcap": {
        const { rows } = await pool.query(`
          SELECT
            p.player_id, p.name, p.symbol, p.supply, p.price, p.token_address,
            (p.supply::numeric * p.price::numeric / 1e36) AS market_cap_display,
            COALESCE(t.volume, '0') AS volume,
            COALESCE(t.trade_count, 0) AS trade_count
          FROM players p
          LEFT JOIN (
            SELECT player_id, SUM(cost_or_proceeds) AS volume, COUNT(*) AS trade_count
            FROM trades GROUP BY player_id
          ) t ON t.player_id = p.player_id
          ORDER BY (p.supply::numeric * p.price::numeric) DESC
          LIMIT 50
        `);
        return res.json({ type, entries: rows });
      }

      /* ── Top 50 by price gain % (earliest vs current price) ── */
      case "gainers": {
        const { rows } = await pool.query(`
          SELECT
            p.player_id, p.name, p.symbol, p.price, p.token_address,
            first_pp.price AS first_price,
            CASE WHEN first_pp.price > 0
              THEN ((p.price::numeric - first_pp.price::numeric) / first_pp.price::numeric * 100)
              ELSE 0
            END AS gain_pct
          FROM players p
          LEFT JOIN LATERAL (
            SELECT price FROM price_points pp
            WHERE pp.player_id = p.player_id
            ORDER BY pp.block_number ASC
            LIMIT 1
          ) first_pp ON true
          ORDER BY gain_pct DESC
          LIMIT 50
        `);
        return res.json({ type, entries: rows });
      }

      /* ── Top 50 whale holders by total holdings value ── */
      case "whales": {
        const { rows } = await pool.query(`
          SELECT
            h.address,
            SUM(h.balance::numeric * p.price::numeric / 1e36) AS total_value,
            COUNT(DISTINCT h.player_id) AS player_count,
            json_agg(json_build_object(
              'player_id', h.player_id,
              'symbol', p.symbol,
              'balance', h.balance
            ) ORDER BY (h.balance::numeric * p.price::numeric) DESC) AS top_holdings
          FROM holdings h
          JOIN players p ON p.player_id = h.player_id
          WHERE h.balance > 0
          GROUP BY h.address
          ORDER BY total_value DESC
          LIMIT 50
        `);
        return res.json({ type, entries: rows });
      }

      /* ── Top 50 players by total dividends paid ── */
      case "dividends": {
        const { rows } = await pool.query(`
          SELECT
            p.player_id, p.name, p.symbol, p.token_address,
            COALESCE(d.total_dividends, '0') AS total_dividends,
            COALESCE(d.dividend_count, 0) AS dividend_count
          FROM players p
          LEFT JOIN (
            SELECT player_id, SUM(amount) AS total_dividends, COUNT(*) AS dividend_count
            FROM dividends GROUP BY player_id
          ) d ON d.player_id = p.player_id
          ORDER BY COALESCE(d.total_dividends, 0) DESC
          LIMIT 50
        `);
        return res.json({ type, entries: rows });
      }

      /* ── Top 50 referrers by earnings ── */
      case "referrals": {
        const { rows } = await pool.query(`
          SELECT
            referrer,
            SUM(amount) AS total_earnings,
            COUNT(*) AS referral_count,
            COUNT(DISTINCT trader) AS unique_traders
          FROM referral_earnings
          GROUP BY referrer
          ORDER BY SUM(amount) DESC
          LIMIT 50
        `);
        return res.json({ type, entries: rows });
      }

      default:
        return res.status(400).json({
          error: `Unknown leaderboard type: ${type}`,
          validTypes: ["mcap", "gainers", "whales", "dividends", "referrals"],
        });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Global stats ────────────────────────────────────────── */

app.get("/api/stats", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM stats WHERE id = 1");

    // Count unique traders from trades table
    const traderResult = await pool.query(
      "SELECT COUNT(DISTINCT trader) AS cnt FROM trades"
    );
    const playerResult = await pool.query(
      "SELECT COUNT(*) AS cnt FROM players"
    );

    const s = rows[0] || {};
    res.json({
      total_volume: s.total_volume || "0",
      total_trades: s.total_trades || 0,
      total_dividends: s.total_dividends || "0",
      unique_traders: Number(traderResult.rows[0].cnt),
      total_players: Number(playerResult.rows[0].cnt),
      updated_at: s.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── AI Judge ────────────────────────────────────────────── */

const OKLINK_BASE = "https://www.oklink.com/xlayer-test";
const DEPLOYED_CONTRACTS = [
  { name: "MockUSDT",           address: "0x4F51c373145bdd8F3EFbD90f4c3409CC2f1Ea851" },
  { name: "PlayerTokenFactory", address: "0x8d2b077ca39CaAdBE6a659128943106e784D8BD7" },
  { name: "PlayerToken_impl",   address: "0xA177d2c0669eD77FF2FED4e820412fB6b9643364" },
  { name: "PlayerMarket",       address: "0xd98B4e5296c66aE56c55C5A4c1e9EB0DD512196f" },
  { name: "PerformanceOracle",  address: "0xF1277da9b1F4b7b72A3A16EC8C17a00Ce702C056" },
];

app.get("/api/judge", async (_req, res) => {
  try {
    // --- Global metrics ---
    const statsResult = await pool.query("SELECT * FROM stats WHERE id = 1");
    const s = statsResult.rows[0] || {};

    const traderResult = await pool.query("SELECT COUNT(DISTINCT trader) AS cnt FROM trades");
    const playerResult = await pool.query("SELECT COUNT(*) AS cnt FROM players");
    const graduatedResult = await pool.query("SELECT COUNT(*) AS cnt FROM players WHERE graduated = true");
    const earliestPlayer = await pool.query("SELECT MIN(listed_at) AS first_listed FROM players");

    const globalMetrics = {
      totalVolume: s.total_volume || "0",
      totalTrades: s.total_trades || 0,
      graduatedCount: Number(graduatedResult.rows[0].cnt),
      totalDividendsPaid: s.total_dividends || "0",
      uniqueAddresses: Number(traderResult.rows[0].cnt),
      totalPlayers: Number(playerResult.rows[0].cnt),
      listedAt: earliestPlayer.rows[0].first_listed || null,
    };

    // --- Contracts ---
    const contracts = DEPLOYED_CONTRACTS.map((c) => ({
      name: c.name,
      address: c.address,
      oklinkUrl: `${OKLINK_BASE}/address/${c.address}`,
      verified: true,
    }));

    // --- Recent events (last 50 trades + dividends merged, sorted by time) ---
    const recentEventsResult = await pool.query(`
      (
        SELECT
          'trade' AS type,
          tx_hash,
          json_build_object(
            'player_id', t.player_id,
            'side', t.side,
            'trader', t.trader,
            'shares', t.shares,
            'cost_or_proceeds', t.cost_or_proceeds,
            'fee', t.fee
          ) AS details,
          t.block_number,
          t.created_at AS timestamp
        FROM trades t
        ORDER BY t.created_at DESC
        LIMIT 50
      )
      UNION ALL
      (
        SELECT
          'dividend' AS type,
          tx_hash,
          json_build_object(
            'player_id', d.player_id,
            'stat_type', d.stat_type,
            'amount', d.amount
          ) AS details,
          d.block_number,
          d.created_at AS timestamp
        FROM dividends d
        ORDER BY d.created_at DESC
        LIMIT 50
      )
      ORDER BY timestamp DESC
      LIMIT 50
    `);

    const recentEvents = recentEventsResult.rows.map((r) => ({
      type: r.type,
      txHash: r.tx_hash,
      oklinkTxUrl: `${OKLINK_BASE}/tx/${r.tx_hash}`,
      details: r.details,
      blockNumber: r.block_number,
      timestamp: r.timestamp,
    }));

    // --- Verification script ---
    const verificationScript = [
      "#!/usr/bin/env bash",
      "# KickStock On-Chain Verification Script",
      "# Verifies deployed contracts and state on X Layer Testnet",
      'RPC="https://testrpc.xlayer.tech"',
      "",
      "echo '=== Contract Code Verification ==='",
      ...DEPLOYED_CONTRACTS.map(
        (c) =>
          `echo "Checking ${c.name} at ${c.address}..." && ` +
          `CODE=$(cast code ${c.address} --rpc-url $RPC 2>/dev/null) && ` +
          `[ "$CODE" != "0x" ] && echo "  ✓ Contract has code" || echo "  ✗ No code found"`
      ),
      "",
      "echo ''",
      "echo '=== PlayerMarket State ==='",
      `echo "Listed count:" && cast call ${DEPLOYED_CONTRACTS[3].address} "listedCount()(uint256)" --rpc-url $RPC`,
      `echo "Curve base:" && cast call ${DEPLOYED_CONTRACTS[3].address} "curveBase()(uint256)" --rpc-url $RPC`,
      `echo "Curve slope:" && cast call ${DEPLOYED_CONTRACTS[3].address} "curveSlope()(uint256)" --rpc-url $RPC`,
      `echo "Fee bps:" && cast call ${DEPLOYED_CONTRACTS[3].address} "feeBps()(uint16)" --rpc-url $RPC`,
      `echo "Oracle:" && cast call ${DEPLOYED_CONTRACTS[3].address} "oracle()(address)" --rpc-url $RPC`,
      "",
      "echo ''",
      "echo '=== OKLink Explorer Links ==='",
      ...DEPLOYED_CONTRACTS.map(
        (c) => `echo "${c.name}: ${OKLINK_BASE}/address/${c.address}"`
      ),
    ].join("\n");

    res.json({
      globalMetrics,
      contracts,
      recentEvents,
      verificationScript,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Start ───────────────────────────────────────────────── */

function startApi() {
  return new Promise((resolve) => {
    app.listen(config.apiPort, () => {
      console.log(`[api] listening on port ${config.apiPort}`);
      resolve();
    });
  });
}

module.exports = { startApi, app };
