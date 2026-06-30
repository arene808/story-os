// ============================================================
// Story OS — Database connection (Drizzle + Postgres)
//
// Lazy, resilient connection.
// If DATABASE_URL is set but unreachable → falls back to
// in-memory store (with console.warn) instead of crashing.
// ============================================================

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _checked = false; // prevent repeated failed connection attempts

function createDb(): ReturnType<typeof drizzle<typeof schema>> | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  try {
    const client = postgres(url, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 5, // fail fast
    });
    return drizzle(client, { schema });
  } catch {
    return null;
  }
}

/**
 * Test if the DB connection is alive by running SELECT 1.
 * If it fails, set _checked=true so we don't keep retrying.
 */
async function ping(db: ReturnType<typeof drizzle<typeof schema>>): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (e) {
    console.warn(
      "[db] Database unreachable, falling back to in-memory store. " +
      `Error: ${(e as Error).message}`
    );
    _db = null;
    _checked = true;
    return false;
  }
}

/** Returns true if DATABASE_URL is configured */
export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Returns a Drizzle instance if the database is reachable.
 * On first call, pings the DB to verify connectivity.
 * Returns null if unavailable → service layer falls back to memory.
 */
export async function getDb() {
  if (_checked && !_db) return null;

  if (!_db) {
    _db = createDb();
    if (!_db) {
      _checked = true;
      return null;
    }
  }

  // Verify connection on first use
  if (!_checked) {
    const ok = await ping(_db);
    if (!ok) return null;
    _checked = true;
  }

  return _db;
}

// Re-export schema
export * from "./schema";

/**
 * Check if an error is a PostgreSQL invalid-UUID error.
 * Drizzle wraps PostgresError — we check both the wrapper and its cause.
 */
function isUuidError(e: unknown): boolean {
  const check = (err: unknown) => {
    const pgCode = (err as Record<string, unknown>)?.code;
    if (pgCode === "22P02") return true;
    const msg = (err as Error)?.message ?? "";
    return msg.includes("22P02") || msg.includes("invalid input syntax for type uuid");
  };
  return check(e) || check((e as Error)?.cause);
}

/**
 * Wrap a DB query that fetches rows by ID. Returns null on invalid UUID
 * instead of throwing. For other errors, the original error is thrown.
 */
export async function safeGetById<T>(query: Promise<T[]>): Promise<T | null> {
  try {
    const rows = await query;
    return rows.length > 0 ? rows[0] : null;
  } catch (e) {
    if (isUuidError(e)) return null;
    throw e;
  }
}

/**
 * Wrap a DB mutation (update/delete) that may receive an invalid UUID.
 * Returns null instead of throwing on UUID errors, allowing the caller
 * to treat it as "not found".
 */
export async function safeMutate<T>(query: Promise<T[]>): Promise<T | null> {
  try {
    const rows = await query;
    return rows.length > 0 ? rows[0] : null;
  } catch (e) {
    if (isUuidError(e)) return null;
    throw e;
  }
}
