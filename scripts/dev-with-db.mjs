// ============================================================
// Story OS — Dev server with embedded PostgreSQL
//
// Starts an embedded PostgreSQL instance, waits for it to be
// ready, then launches `next dev`. When Next.js exits, the
// database is cleanly shut down.
//
// Data directory: E:\Large-scale softwares\postgres-data
// Port: 5432  |  User: postgres  |  Password: password
//
// Usage: node scripts/dev-with-db.mjs
// ============================================================

// CRITICAL: Force C locale BEFORE import to prevent Chinese
// Windows GBK encoding from corrupting PostgreSQL initdb
process.env.LC_ALL = "C";
process.env.LANG = "C";
process.env.LANGUAGE = "C";

import { spawn } from "node:child_process";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = "E:\\Large-scale softwares\\postgres-data";
const PORT = 5432;
const DB_NAME = "storyos";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  port: PORT,
  user: "postgres",
  password: "password",
  persistent: true,
  // Chinese Windows locale fix: force C locale (UTF-8)
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
  onLog: (msg) => {
    // Only show important messages
    if (msg.includes("ready") || msg.includes("started") || msg.includes("error")) {
      console.log(`  [pg] ${msg.trim()}`);
    }
  },
  onError: (err) => {
    console.error(`  [pg] ERROR: ${err}`);
  },
});

async function main() {
  console.log("\n  Story OS — Starting embedded PostgreSQL...\n");

  // Step 1: Initialise data directory (downloads binaries on first run)
  try {
    console.log("  [1/3] Initialising PostgreSQL...");
    await pg.initialise();
    console.log("  [1/3] Done.\n");
  } catch (e) {
    // If already initialised, this is fine
    if (!e.message?.includes("already exists")) {
      console.error("  Failed to initialise:", e.message);
    }
  }

  // Step 2: Start PostgreSQL
  console.log("  [2/3] Starting PostgreSQL on port 5432...");
  await pg.start();
  console.log("  [2/3] PostgreSQL is ready.\n");

  // Step 3: Create database if needed
  try {
    await pg.createDatabase(DB_NAME);
    console.log(`  [*] Database '${DB_NAME}' created.\n`);
  } catch (e) {
    // Database already exists — fine
  }

  // Step 4: Launch Next.js
  console.log("  [3/3] Starting Next.js dev server...\n");
  console.log("  ───────────────────────────────────────────\n");

  const next = spawn("npx", ["next", "dev"], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      // Override — tell Next.js to use our embedded PostgreSQL
      DATABASE_URL: `postgresql://postgres:password@localhost:${PORT}/${DB_NAME}`,
    },
  });

  // Forward exit code
  next.on("close", async (code) => {
    console.log(`\n  Next.js exited (code ${code}). Stopping PostgreSQL...`);
    try {
      await pg.stop();
    } catch {}
    console.log("  PostgreSQL stopped. Bye!\n");
    process.exit(code ?? 0);
  });

  // Handle Ctrl+C gracefully
  const shutdown = async () => {
    console.log("\n  Shutting down...");
    next.kill("SIGTERM");
    try { await pg.stop(); } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error("  Fatal error:", e?.message ?? e ?? "unknown error");
  console.error(e?.stack?.split("\n").slice(0,8).join("\n") ?? "");
  process.exit(1);
});
