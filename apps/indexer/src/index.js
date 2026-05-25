const { initSchema } = require("./db");
const { startIndexer } = require("./indexer");
const { startApi } = require("./api");

async function main() {
  console.log("[kickstock-indexer] booting...");

  // 1. Initialise DB schema
  await initSchema();

  // 2. Start REST API
  await startApi();

  // 3. Start indexer background loop
  await startIndexer();

  console.log("[kickstock-indexer] running");
}

main().catch((err) => {
  console.error("[kickstock-indexer] fatal error:", err);
  process.exit(1);
});
