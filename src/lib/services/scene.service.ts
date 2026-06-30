// ============================================================
// Story OS 鈥?Scene Service
// CRUD for scenes. DB-first with in-memory fallback.
// ============================================================

import { eq, and } from "drizzle-orm";
import { getDb, scenes, safeGetById } from "@/lib/db";
import type { Scene, SceneFact, OpenThread, SceneStatus } from "@/types";
import { mockScenes } from "@/lib/mock-data";
import { seedFromFile, saveStore } from "@/lib/store/file-store";

// -----------------------------------------------------------
// In-memory fallback with file persistence
// -----------------------------------------------------------
const GLOBAL_KEY = "__story_os_scene_store__";
const FILE_NAME = "scenes.json";

function getMemStore(): Map<string, Scene> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, Scene>();
    seedFromFile(FILE_NAME, g[GLOBAL_KEY] as Map<string, Scene>, mockScenes);
  }
  return g[GLOBAL_KEY] as Map<string, Scene>;
}

function persist() {
  saveStore(FILE_NAME, getMemStore());
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function dbRowToScene(row: typeof scenes.$inferSelect): Scene {
  return {
    id: row.id,
    storyId: row.storyId,
    branchId: row.branchId ?? null,
    parentSceneId: row.parentSceneId ?? null,
    title: row.title,
    content: row.content ?? "",
    summaryShort: row.summaryShort ?? "",
    summaryLong: row.summaryLong ?? "",
    sortOrder: row.sortOrder ?? 0,
    status: row.status as SceneStatus,
    wordCount: row.wordCount ?? 0,
    factsAdded: (row.factsAdded as SceneFact[]) ?? [],
    openThreads: (row.openThreads as OpenThread[]) ?? [],
    meta: (row.meta as Record<string, unknown>) ?? {},
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    updatedAt: (row.updatedAt ?? new Date()).toISOString(),
  };
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Chinese text: count characters; mixed: count space-separated tokens
  const hasCJK = /[一-鿿]/.test(trimmed);
  if (hasCJK) return trimmed.replace(/\s/g, "").length;
  return trimmed.split(/\s+/).length;
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

export async function listScenesByStory(storyId: string): Promise<Scene[]> {
  const db = await getDb();
  if (db) {
    const rows = await db
      .select()
      .from(scenes)
      .where(and(eq(scenes.storyId, storyId)))
      .orderBy(scenes.sortOrder);
    return rows.map(dbRowToScene);
  }
  return Array.from(getMemStore().values())
    .filter((s) => s.storyId === storyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getScene(id: string): Promise<Scene | null> {
  const db = await getDb();
  if (db) {
    const row = await safeGetById(db.select().from(scenes).where(eq(scenes.id, id)).limit(1));
    return row ? dbRowToScene(row) : null;
  }
  return getMemStore().get(id) ?? null;
}

export async function createScene(input: {
  storyId: string;
  title: string;
  content?: string;
  status?: SceneStatus;
  parentSceneId?: string | null;
  branchId?: string | null;
}): Promise<Scene> {
  const db = await getDb();

  // Get next sort_order
  let maxOrder = 0;
  const allScenes = await listScenesByStory(input.storyId);
  if (allScenes.length > 0) {
    maxOrder = Math.max(...allScenes.map((s) => s.sortOrder)) + 1;
  }

  const wordCount = countWords(input.content ?? "");

  if (db) {
    const rows = await db
      .insert(scenes)
      .values({
        storyId: input.storyId,
        title: input.title,
        content: input.content ?? "",
        status: input.status ?? "draft",
        sortOrder: maxOrder,
        wordCount,
        branchId: input.branchId ?? null,
        parentSceneId: input.parentSceneId ?? null,
      })
      .returning();
    return dbRowToScene(rows[0]);
  }

  // In-memory fallback
  const now = new Date().toISOString();
  const scene: Scene = {
    id: `mem-scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storyId: input.storyId,
    branchId: input.branchId ?? null,
    parentSceneId: input.parentSceneId ?? null,
    title: input.title,
    content: input.content ?? "",
    summaryShort: "",
    summaryLong: "",
    sortOrder: maxOrder,
    status: input.status ?? "draft",
    wordCount,
    factsAdded: [],
    openThreads: [],
    meta: {},
    createdAt: now,
    updatedAt: now,
  };
  getMemStore().set(scene.id, scene);
  persist();
  return scene;
}

export async function updateScene(
  id: string,
  input: Partial<{
    title: string;
    content: string;
    status: SceneStatus;
    summaryShort: string;
    summaryLong: string;
    sortOrder: number;
    parentSceneId: string | null;
    factsAdded: SceneFact[];
    openThreads: OpenThread[];
  }>
): Promise<Scene | null> {
  const wordCount = input.content !== undefined ? countWords(input.content) : undefined;

  const db = await getDb();
  if (db) {
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) {
      updateData.content = input.content;
      updateData.wordCount = wordCount;
    }
    if (input.status !== undefined) updateData.status = input.status;
    if (input.summaryShort !== undefined) updateData.summaryShort = input.summaryShort;
    if (input.summaryLong !== undefined) updateData.summaryLong = input.summaryLong;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (input.parentSceneId !== undefined) updateData.parentSceneId = input.parentSceneId;
    if (input.factsAdded !== undefined) updateData.factsAdded = input.factsAdded;
    if (input.openThreads !== undefined) updateData.openThreads = input.openThreads;
    updateData.updatedAt = new Date();

    const rows = await db
      .update(scenes)
      .set(updateData as typeof scenes.$inferInsert)
      .where(eq(scenes.id, id))
      .returning();
    if (rows.length === 0) return null;
    return dbRowToScene(rows[0]);
  }

  const existing = getMemStore().get(id);
  if (!existing) return null;

  const updated: Scene = {
    ...existing,
    title: input.title ?? existing.title,
    content: input.content ?? existing.content,
    status: input.status ?? existing.status,
    summaryShort: input.summaryShort ?? existing.summaryShort,
    summaryLong: input.summaryLong ?? existing.summaryLong,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    wordCount: wordCount ?? existing.wordCount,
    factsAdded: input.factsAdded ?? existing.factsAdded,
    openThreads: input.openThreads ?? existing.openThreads,
    parentSceneId: input.parentSceneId !== undefined ? input.parentSceneId : existing.parentSceneId,
    updatedAt: new Date().toISOString(),
  };
  getMemStore().set(id, updated);
  persist();
  return updated;
}

export async function deleteScene(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.delete(scenes).where(eq(scenes.id, id));
    return true;
  }
  const deleted = getMemStore().delete(id);
  if (deleted) persist();
  return deleted;
}

