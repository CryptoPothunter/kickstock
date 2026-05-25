const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({ connectionString: config.databaseUrl });

/**
 * Initialise all tables if they don't exist yet.
 */
async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS indexer_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_block BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO indexer_state (id, last_block)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        player_id INTEGER PRIMARY KEY,
        token_address TEXT NOT NULL,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        supply NUMERIC(78,0) NOT NULL DEFAULT 0,
        reserve NUMERIC(78,0) NOT NULL DEFAULT 0,
        dividend_budget NUMERIC(78,0) NOT NULL DEFAULT 0,
        price NUMERIC(78,0) NOT NULL DEFAULT 0,
        listed_at TIMESTAMPTZ DEFAULT NOW(),
        graduated BOOLEAN DEFAULT FALSE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players(player_id),
        trader TEXT NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('buy','sell')),
        shares NUMERIC(78,0) NOT NULL,
        cost_or_proceeds NUMERIC(78,0) NOT NULL,
        fee NUMERIC(78,0) NOT NULL,
        new_supply NUMERIC(78,0) NOT NULL,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS price_points (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players(player_id),
        price NUMERIC(78,0) NOT NULL,
        supply NUMERIC(78,0) NOT NULL,
        block_number BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dividends (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL REFERENCES players(player_id),
        stat_type INTEGER NOT NULL,
        amount NUMERIC(78,0) NOT NULL,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS dividend_claims (
        id SERIAL PRIMARY KEY,
        holder TEXT NOT NULL,
        token_address TEXT NOT NULL,
        amount NUMERIC(78,0) NOT NULL,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS holdings (
        address TEXT NOT NULL,
        player_id INTEGER NOT NULL,
        balance NUMERIC(78,0) NOT NULL DEFAULT 0,
        PRIMARY KEY (address, player_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lp_positions (
        address TEXT NOT NULL,
        player_id INTEGER NOT NULL,
        lp_shares NUMERIC(78,0) NOT NULL DEFAULT 0,
        PRIMARY KEY (address, player_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        user_address TEXT PRIMARY KEY,
        referrer TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS referral_earnings (
        id SERIAL PRIMARY KEY,
        referrer TEXT NOT NULL,
        trader TEXT NOT NULL,
        amount NUMERIC(78,0) NOT NULL,
        tx_hash TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS indices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        player_ids INTEGER[] NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS research_snapshots (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL,
        fair_value NUMERIC(78,0),
        rating TEXT,
        summary TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_volume NUMERIC(78,0) NOT NULL DEFAULT 0,
        total_trades INTEGER NOT NULL DEFAULT 0,
        total_dividends NUMERIC(78,0) NOT NULL DEFAULT 0,
        unique_traders INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO stats (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query("COMMIT");
    console.log("[db] schema initialised");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* ── helpers ─────────────────────────────────────────────── */

async function getLastBlock() {
  const { rows } = await pool.query(
    "SELECT last_block FROM indexer_state WHERE id = 1"
  );
  return Number(rows[0].last_block);
}

async function setLastBlock(blockNumber) {
  await pool.query(
    "UPDATE indexer_state SET last_block = $1, updated_at = NOW() WHERE id = 1",
    [blockNumber]
  );
}

module.exports = { pool, initSchema, getLastBlock, setLastBlock };
