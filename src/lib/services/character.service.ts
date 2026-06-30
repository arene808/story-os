// ============================================================
// Story OS 鈥?Character Service (globalThis-backed)
// ============================================================

import { getDb, characters, safeGetById } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { Character, CharacterRelation } from "@/types";
import { mockCharacters } from "@/lib/mock-data";
import { seedFromFile, saveStore } from "@/lib/store/file-store";

const GK = "__story_os_character_store__";
const FN = "characters.json";

function store(): Map<string, Character> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GK]) {
    g[GK] = new Map<string, Character>();
    seedFromFile(FN, g[GK] as Map<string, Character>, mockCharacters);
  }
  return g[GK] as Map<string, Character>;
}
function persist() { saveStore(FN, store()); }

function rowToChar(row: typeof characters.$inferSelect): Character {
  return {
    id: row.id, storyId: row.storyId, userId: row.userId,
    name: row.name, aliases: row.aliases ?? "",
    description: row.description ?? "", appearance: row.appearance ?? "",
    personality: row.personality ?? "", background: row.background ?? "",
    motivations: row.motivations ?? "",
    relationships: (row.relationships as CharacterRelation[]) ?? [],
    notes: row.notes ?? "", isMajor: row.isMajor ?? false,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    updatedAt: (row.updatedAt ?? new Date()).toISOString(),
  };
}

export async function listByStory(storyId: string): Promise<Character[]> {
  const db = await getDb();
  if (db) { return (await db.select().from(characters).where(eq(characters.storyId, storyId))).map(rowToChar); }
  return Array.from(store().values()).filter((c) => c.storyId === storyId);
}

export async function create(input: { storyId: string; name: string; description?: string; isMajor?: boolean }): Promise<Character> {
  const db = await getDb();
  if (db) {
    const rows = await db.insert(characters).values({ storyId: input.storyId, userId: "default", name: input.name, description: input.description ?? "", isMajor: input.isMajor ?? false }).returning();
    return rowToChar(rows[0]);
  }
  const now = new Date().toISOString();
  const c: Character = { id: `mem-char-${Date.now()}`, storyId: input.storyId, userId: "default", name: input.name, aliases: "", description: input.description ?? "", appearance: "", personality: "", background: "", motivations: "", relationships: [], notes: "", isMajor: input.isMajor ?? false, createdAt: now, updatedAt: now };
  store().set(c.id, c);
  persist();
  return c;
}

export async function remove(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) { await db.delete(characters).where(eq(characters.id, id)); return true; }
  const deleted = store().delete(id);
  if (deleted) persist();
  return deleted;
}
