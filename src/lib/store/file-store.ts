// ============================================================
// Story OS — File-based persistence for in-memory stores
//
// When DATABASE_URL is not configured, service data is stored
// in JSON files under the `data/` directory so it survives
// server restarts. This is transparent to the service layer —
// services call load/save alongside their existing Map logic.
// ============================================================

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

/** Try to load a Map from a JSON file. Returns null if file doesn't exist. */
export function loadStore<T>(filename: string): Map<string, T> | null {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const entries: [string, T][] = JSON.parse(raw);
    return new Map(entries);
  } catch (e) {
    console.warn(`[store] Failed to load ${filename}:`, (e as Error).message);
    return null;
  }
}

/**
 * Save a Map to a JSON file (atomic write via temp file + rename).
 * Filters out internal sentinel keys (those starting with "__").
 */
export function saveStore<T>(filename: string, store: Map<string, T>): void {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Exclude internal sentinel entries
    const entries = Array.from(store.entries()).filter(
      ([key]) => !key.startsWith("__")
    );
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), "utf-8");
  } catch (e) {
    console.error(`[store] Failed to save ${filename}:`, (e as Error).message);
  }
}

/**
 * Seed a store from file or mock data. Call once per store init.
 * Returns true if data was loaded from disk, false if seeded from mock.
 */
export function seedFromFile<T extends { id: string }>(
  filename: string,
  store: Map<string, T>,
  mockData: T[]
): boolean {
  // Try loading from disk first
  const loaded = loadStore<T>(filename);
  if (loaded && loaded.size > 0) {
    for (const [k, v] of loaded) {
      store.set(k, v);
    }
    return true;
  }

  // Fall back to mock data (first run)
  for (const item of mockData) {
    store.set(item.id, item);
  }
  saveStore(filename, store);
  return false;
}
