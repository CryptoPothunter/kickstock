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
    const sortBy = req.query.sort === "volume" ? "volume" : "market_cap";
    let orderCol =
      sortBy === "volume" ? "COALESCE(t.volume, 0)" : "(p.supply::numeric * p.price::numeric)";

    const { rows } = await pool.query(`
      SELECT
        p.player_id,
        p.name,
        p.symbol,
        p.supply,
        p.price,
        p.token_address,
        (p.supply::numeric * p.price::numeric / 1e36) AS market_cap_display,
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
      ORDER BY ${orderCol} DESC
      LIMIT 50
    `);
    res.json(rows);
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

/* ── AI Judge placeholder ────────────────────────────────── */

app.get("/api/judge", async (_req, res) => {
  res.json({
    verdict: "placeholder",
    message:
      "AI Judge is not yet implemented. This endpoint will return player performance ratings.",
    ratings: [
      { player_id: 1, rating: "A", confidence: 0.85 },
      { player_id: 2, rating: "B+", confidence: 0.72 },
      { player_id: 3, rating: "A-", confidence: 0.78 },
    ],
  });
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
