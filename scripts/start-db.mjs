// ============================================================
// Start embedded PostgreSQL (standalone, stays alive until Ctrl+C)
//
// Usage: node scripts/start-db.mjs
// ============================================================

// CRITICAL: Sanitize environment for Chinese Windows compatibility.
// embedded-postgres passes process.env to initdb, and GBK-encoded
// characters (from Chinese-named directories) break UTF-8 PostgreSQL.
// We keep only essential variables plus force C locale.
const SAFE_ENV_KEYS = new Set([
  "SYSTEMROOT", "SystemRoot", "WINDIR", "SystemDrive",
  "TEMP", "TMP", "USERPROFILE", "APPDATA", "LOCALAPPDATA",
  "HOMEDRIVE", "HOMEPATH", "COMPUTERNAME", "USERNAME",
  "PATH", "PATHEXT", "PROCESSOR_ARCHITECTURE", "NUMBER_OF_PROCESSORS",
  "OS", "COMSPEC", "PROGRAMFILES", "PROGRAMFILES(X86)",
  "COMMONPROGRAMFILES", "COMMONPROGRAMFILES(X86)",
  "DRIVERDATA", "ALLUSERSPROFILE", "PUBLIC",
  "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "DATABASE_URL",
]);
for (const key of Object.keys(process.env)) {
  if (!SAFE_ENV_KEYS.has(key)) {
    delete process.env[key];
  }
}
process.env.LC_ALL = "C";
process.env.LANG = "C";
process.env.LANGUAGE = "C";

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
  initdbFlags: ["--no-locale", "--encoding=UTF8"],
  onLog: (msg) => {
    if (msg.includes("ready") || msg.includes("error")) {
      console.log(`  [pg] ${msg.trim()}`);
    }
  },
});

async function main() {
  console.log("\n  Starting embedded PostgreSQL...");
  console.log(`  Data dir: ${DATA_DIR}\n`);

  // Step 1: Initialise
  try {
    console.log("  [1] Initialising...");
    await pg.initialise();
    console.log("  [1] Done.\n");
  } catch (e) {
    console.log(`  [1] Initialise note: ${e?.message ?? e}\n`);
  }

  // Step 2: Start
  try {
    console.log("  [2] Starting PostgreSQL on port 5432...");
    await pg.start();
    console.log("  [2] PostgreSQL ready!\n");
  } catch (e) {
    console.error(`\n  [2] FAILED to start: ${e?.message ?? e}`);
    console.error(e?.stack?.split("\n").slice(0,5).join("\n") ?? "");
    throw e;
  }

  // Step 3: Create database
  try {
    await pg.createDatabase(DB_NAME);
    console.log(`  [3] Database '${DB_NAME}' ready.\n`);
  } catch (e) {
    console.log(`  [3] Database note: ${e?.message ?? e}\n`);
  }

  console.log("  Press Ctrl+C to stop.\n");

  process.on("SIGINT", async () => {
    console.log("\n  Stopping PostgreSQL...");
    try { await pg.stop(); } catch {}
    console.log("  Done.\n");
    process.exit(0);
  });
  setInterval(() => {}, 60000);
}

main().catch((e) => {
  console.error("Fatal:", e?.message ?? e ?? "unknown error");
  console.error(e?.stack ?? "");
  process.exit(1);
});
