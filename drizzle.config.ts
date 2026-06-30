// ============================================================
// Story OS — Drizzle Kit configuration
// ============================================================

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./supabase/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // MVP: verbose logging for debugging
  verbose: true,
  // Strict mode: fail on any schema drift
  strict: true,
});
