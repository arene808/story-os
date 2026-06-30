// ============================================================
// Story OS — Story Service
// CRUD for stories. Uses Drizzle when DB is available,
// falls back to in-memory store for local dev.
// ============================================================

import { eq } from "drizzle-orm";
import { getDb, stories, safeGetById } from "@/lib/db";
import type { Story } from "@/types";
import { mockStories } from "@/lib/mock-data";
import { seedFromFile, saveStore } from "@/lib/store/file-store";

// -----------------------------------------------------------
// In-memory fallback store (with file persistence)
// -----------------------------------------------------------
const GLOBAL_KEY = "__story_os_story_store__";
const FILE_NAME = "stories.json";

function getMemStore(): Map<string, Story> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, Story>();
    seedFromFile(FILE_NAME, g[GLOBAL_KEY] as Map<string, Story>, mockStories);
  }
  return g[GLOBAL_KEY] as Map<string, Story>;
}

function persist() {
  saveStore(FILE_NAME, getMemStore());
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function dbRowToStory(row: typeof stories.$inferSelect): Story {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description ?? "",
    genre: row.genre ?? "",
    worldSetting: row.worldSetting ?? "",
    status: row.status as Story["status"],
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    updatedAt: (row.updatedAt ?? new Date()).toISOString(),
  };
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export async function listStories(): Promise<Story[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(stories).orderBy(stories.updatedAt);
    return rows.map(dbRowToStory);
  }
  return Array.from(getMemStore().values())
    .filter((s): s is Story => typeof s !== "boolean")
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export async function getStory(id: string): Promise<Story | null> {
  const db = await getDb();
  if (db) {
    const row = await safeGetById(
      db.select().from(stories).where(eq(stories.id, id)).limit(1)
    );
    return row ? dbRowToStory(row) : null;
  }
  return getMemStore().get(id) ?? null;
}

export async function createStory(input: {
  title: string;
  description?: string;
  genre?: string;
  worldSetting?: string;
}): Promise<Story> {
  const db = await getDb();
  if (db) {
    const rows = await db
      .insert(stories)
      .values({
        userId: "default",
        title: input.title,
        description: input.description ?? "",
        genre: input.genre ?? "",
        worldSetting: input.worldSetting ?? "",
        status: "active",
      })
      .returning();
    return dbRowToStory(rows[0]);
  }

  // In-memory fallback
  const now = new Date().toISOString();
  const story: Story = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: "default",
    title: input.title,
    description: input.description ?? "",
    genre: input.genre ?? "",
    worldSetting: input.worldSetting ?? "",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  getMemStore().set(story.id, story);
  persist();
  return story;
}

export async function updateStory(
  id: string,
  input: Partial<Pick<Story, "title" | "description" | "genre" | "worldSetting" | "status">>
): Promise<Story | null> {
  const db = await getDb();
  if (db) {
    const rows = await db
      .update(stories)
      .set({
        title: input.title,
        description: input.description,
        genre: input.genre,
        worldSetting: input.worldSetting,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, id))
      .returning();
    if (rows.length === 0) return null;
    return dbRowToStory(rows[0]);
  }

  const existing = getMemStore().get(id);
  if (!existing) return null;
  const updated: Story = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    genre: input.genre ?? existing.genre,
    worldSetting: input.worldSetting ?? existing.worldSetting,
    status: input.status ?? existing.status,
    updatedAt: new Date().toISOString(),
  };
  getMemStore().set(id, updated);
  persist();
  return updated;
}

export async function deleteStory(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.delete(stories).where(eq(stories.id, id));
    return true;
  }
  const deleted = getMemStore().delete(id);
  if (deleted) persist();
  return deleted;
}

/** Deep-copy a story with all its scenes, characters, branches, and events */
export async function copyStory(sourceId: string): Promise<Story | null> {
  const source = await getStory(sourceId);
  if (!source) return null;

  // Create the copy with a modified title
  const copy = await createStory({
    title: `${source.title} (副本)`,
    description: source.description,
    genre: source.genre,
    worldSetting: source.worldSetting,
  });

  // Copy scenes, branches, characters, events in memory
  const { listScenesByStory, createScene } = await import("./scene.service");
  const { listBranches, createBranch } = await import("./branch.service");
  const { listByStory: listChars, create: createChar } = await import("./character.service");
  const { listByStory: listEvts, create: createEvt } = await import("./event.service");

  const db = await getDb();
  if (db) {
    // DB path: use transactions for consistency
    // Copy branches first (no dependencies)
    const oldBranches = await listBranches(sourceId);
    const branchIdMap = new Map<string, string>();
    for (const b of oldBranches) {
      const nb = await createBranch({ storyId: copy.id, name: b.name, description: b.description, branchType: b.branchType, parentBranchId: null });
      branchIdMap.set(b.id, nb.id);
    }

    // Copy scenes
    const oldScenes = await listScenesByStory(sourceId);
    const sceneIdMap = new Map<string, string>();
    for (const s of oldScenes) {
      const ns = await createScene({
        storyId: copy.id,
        title: s.title,
        content: s.content,
        status: s.status,
        branchId: s.branchId ? (branchIdMap.get(s.branchId) ?? null) : null,
        parentSceneId: null,
      });
      sceneIdMap.set(s.id, ns.id);
    }

    // Copy characters
    const oldChars = await listChars(sourceId);
    for (const c of oldChars) {
      await createChar({ storyId: copy.id, name: c.name, description: c.description, isMajor: c.isMajor });
    }

    // Copy events (remap sceneId)
    const oldEvents = await listEvts(sourceId);
    for (const e of oldEvents) {
      await createEvt({
        storyId: copy.id,
        sceneId: e.sceneId ? (sceneIdMap.get(e.sceneId) ?? undefined) : undefined,
        title: e.title,
        description: e.description,
        eventTime: e.eventTime,
        eventOrder: e.eventOrder,
      });
    }

    return copy;
  }

  // In-memory path
  const oldBranches = (await listBranches(sourceId)).filter((b) => typeof b !== "boolean");
  const branchIdMap = new Map<string, string>();
  for (const b of oldBranches) {
    if (b.id) {
      const nb = await createBranch({ storyId: copy.id, name: b.name, description: b.description, branchType: b.branchType, parentBranchId: null });
      branchIdMap.set(b.id, nb.id);
    }
  }

  const oldScenes = (await listScenesByStory(sourceId)).filter((s) => typeof s !== "boolean");
  for (const s of oldScenes) {
    if (s.id) {
      await createScene({
        storyId: copy.id,
        title: s.title,
        content: s.content,
        status: s.status,
        branchId: s.branchId ? (branchIdMap.get(s.branchId) ?? null) : null,
        parentSceneId: null,
      });
    }
  }

  const oldChars = (await listChars(sourceId)).filter((c) => typeof c !== "boolean");
  for (const c of oldChars) {
    if (c.id) {
      await createChar({ storyId: copy.id, name: c.name, description: c.description, isMajor: c.isMajor });
    }
  }

  const oldEvents = (await listEvts(sourceId)).filter((e) => typeof e !== "boolean");
  for (const e of oldEvents) {
    if (e.id) {
      await createEvt({
        storyId: copy.id,
        sceneId: e.sceneId ?? undefined,
        title: e.title,
        description: e.description,
        eventTime: e.eventTime,
        eventOrder: e.eventOrder,
      });
    }
  }

  return copy;
}
