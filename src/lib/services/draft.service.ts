// ============================================================
// Story OS 鈥?Draft Service
// CRUD for AI-generated drafts. All AI output MUST go through
// this table before user confirmation promotes it to canon.
//
// Draft/Canon iron law (AGENTS.md 搂2.2):
//   AI output 鈫?drafts table 鈫?user review 鈫?approve 鈫?scenes.content
// ============================================================

import { eq, and } from "drizzle-orm";
import { getDb, drafts, safeGetById } from "@/lib/db";
import type { Draft, DraftStatus, AIAction } from "@/types";
import { mockDrafts } from "@/lib/mock-data";
import { seedFromFile, saveStore } from "@/lib/store/file-store";

// -----------------------------------------------------------
// In-memory fallback with file persistence
// -----------------------------------------------------------
const GLOBAL_KEY = "__story_os_draft_store__";
const FILE_NAME = "drafts.json";

function getMemStore(): Map<string, Draft> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new Map<string, Draft>();
    seedFromFile(FILE_NAME, g[GLOBAL_KEY] as Map<string, Draft>, mockDrafts);
  }
  return g[GLOBAL_KEY] as Map<string, Draft>;
}

function persist() {
  saveStore(FILE_NAME, getMemStore());
}

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function dbRowToDraft(row: typeof drafts.$inferSelect): Draft {
  return {
    id: row.id,
    sceneId: row.sceneId,
    userId: row.userId,
    content: row.content,
    aiAction: row.aiAction as AIAction,
    aiModel: row.aiModel ?? "",
    aiPrompt: row.aiPrompt ?? "",
    status: row.status as DraftStatus,
    wordCount: row.wordCount ?? 0,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
    confirmedAt: row.confirmedAt ? new Date(row.confirmedAt).toISOString() : null,
    rejectedAt: row.rejectedAt ? new Date(row.rejectedAt).toISOString() : null,
  };
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const hasCJK = /[一-鿿]/.test(trimmed);
  if (hasCJK) return trimmed.replace(/\s/g, "").length;
  return trimmed.split(/\s+/).length;
}

// -----------------------------------------------------------
// Public API
// -----------------------------------------------------------

/** Create a new AI draft */
export async function createDraft(input: {
  sceneId: string;
  content: string;
  aiAction: AIAction;
  aiModel?: string;
  aiPrompt?: string;
}): Promise<Draft> {
  const db = await getDb();
  const wordCount = countWords(input.content);

  if (db) {
    const rows = await db
      .insert(drafts)
      .values({
        sceneId: input.sceneId,
        content: input.content,
        aiAction: input.aiAction,
        aiModel: input.aiModel ?? "deepseek-v4-flash",
        aiPrompt: input.aiPrompt ?? "",
        status: "draft",
        wordCount,
      })
      .returning();
    return dbRowToDraft(rows[0]);
  }

  // In-memory fallback
  const now = new Date().toISOString();
  const draft: Draft = {
    id: `mem-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sceneId: input.sceneId,
    userId: "default",
    content: input.content,
    aiAction: input.aiAction,
    aiModel: input.aiModel ?? "deepseek-v4-flash",
    aiPrompt: input.aiPrompt ?? "",
    status: "draft",
    wordCount,
    createdAt: now,
    confirmedAt: null,
    rejectedAt: null,
  };
  getMemStore().set(draft.id, draft);
  persist();
  return draft;
}

/** Get a single draft by ID */
export async function getDraft(id: string): Promise<Draft | null> {
  const db = await getDb();
  if (db) {
    const row = await safeGetById(db.select().from(drafts).where(eq(drafts.id, id)).limit(1));
    return row ? dbRowToDraft(row) : null;
  }
  return getMemStore().get(id) ?? null;
}

/** List all drafts for a scene */
export async function listDraftsByScene(sceneId: string): Promise<Draft[]> {
  const db = await getDb();
  if (db) {
    const rows = await db
      .select()
      .from(drafts)
      .where(eq(drafts.sceneId, sceneId))
      .orderBy(drafts.createdAt);
    return rows.map(dbRowToDraft);
  }
  return Array.from(getMemStore().values())
    .filter((d) => d.sceneId === sceneId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** List pending (status='draft') drafts for a scene */
export async function listPendingDrafts(sceneId: string): Promise<Draft[]> {
  const all = await listDraftsByScene(sceneId);
  return all.filter((d) => d.status === "draft");
}

/**
 * Approve a draft 鈥?promotes it to canon.
 * This is the ONLY path for AI-generated content to become canon.
 *
 * Does NOT update scenes.content here 鈥?that's the caller's responsibility
 * (the canonize API route handles that atomic step).
 */
export async function approveDraft(id: string): Promise<Draft | null> {
  const db = await getDb();
  const now = new Date();

  if (db) {
    const rows = await db
      .update(drafts)
      .set({
        status: "canon",
        confirmedAt: now,
      })
      .where(eq(drafts.id, id))
      .returning();
    if (rows.length === 0) return null;
    return dbRowToDraft(rows[0]);
  }

  const existing = getMemStore().get(id);
  if (!existing) return null;
  const updated: Draft = {
    ...existing,
    status: "canon",
    confirmedAt: now.toISOString(),
  };
  getMemStore().set(id, updated);
  persist();
  return updated;
}

/** Reject a draft */
export async function rejectDraft(id: string): Promise<Draft | null> {
  const db = await getDb();
  const now = new Date();

  if (db) {
    const rows = await db
      .update(drafts)
      .set({
        status: "rejected",
        rejectedAt: now,
      })
      .where(eq(drafts.id, id))
      .returning();
    if (rows.length === 0) return null;
    return dbRowToDraft(rows[0]);
  }

  const existing = getMemStore().get(id);
  if (!existing) return null;
  const updated: Draft = {
    ...existing,
    status: "rejected",
    rejectedAt: now.toISOString(),
  };
  getMemStore().set(id, updated);
  persist();
  return updated;
}

/** Delete a draft (hard delete) */
export async function deleteDraft(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.delete(drafts).where(eq(drafts.id, id));
    return true;
  }
  const deleted = getMemStore().delete(id);
  if (deleted) persist();
  return deleted;
}

