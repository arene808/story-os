// ============================================================
// Story OS 鈥?Branch Service
// CRUD for story branches. DB-first with in-memory fallback.
// ============================================================

import { eq } from "drizzle-orm";
import { getDb, branches, safeGetById } from "@/lib/db";
import type { Branch, BranchType } from "@/types";
import { mockBranches } from "@/lib/mock-data";
import { seedFromFile, saveStore } from "@/lib/store/file-store";

const GK = "__story_os_branch_store__";
const FN = "branches.json";

function store(): Map<string, Branch> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GK]) {
    g[GK] = new Map<string, Branch>();
    seedFromFile(FN, g[GK] as Map<string, Branch>, mockBranches);
  }
  return g[GK] as Map<string, Branch>;
}
function persist() { saveStore(FN, store()); }

function rowToBranch(row: typeof branches.$inferSelect): Branch {
  return {
    id: row.id,
    storyId: row.storyId,
    name: row.name,
    description: row.description ?? "",
    branchType: (row.branchType as BranchType) ?? "mainline",
    parentBranchId: row.parentBranchId ?? null,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function listBranches(storyId: string): Promise<Branch[]> {
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(branches).where(eq(branches.storyId, storyId));
    return rows.map(rowToBranch);
  }
  return Array.from(store().values()).filter((b) => b.storyId === storyId);
}

export async function getBranch(id: string): Promise<Branch | null> {
  const db = await getDb();
  if (db) {
    const row = await safeGetById(db.select().from(branches).where(eq(branches.id, id)).limit(1));
    return row ? rowToBranch(row) : null;
  }
  return store().get(id) ?? null;
}

export async function createBranch(input: {
  storyId: string;
  name: string;
  description?: string;
  branchType?: BranchType;
  parentBranchId?: string | null;
}): Promise<Branch> {
  const db = await getDb();
  if (db) {
    const rows = await db.insert(branches).values({
      storyId: input.storyId,
      name: input.name,
      description: input.description ?? "",
      branchType: input.branchType ?? "mainline",
      parentBranchId: input.parentBranchId ?? null,
    }).returning();
    return rowToBranch(rows[0]);
  }
  const now = new Date().toISOString();
  const b: Branch = {
    id: `mem-branch-${Date.now()}`,
    storyId: input.storyId,
    name: input.name,
    description: input.description ?? "",
    branchType: input.branchType ?? "mainline",
    parentBranchId: input.parentBranchId ?? null,
    createdAt: now,
  };
  store().set(b.id, b);
  persist();
  return b;
}

export async function deleteBranch(id: string): Promise<boolean> {
  const db = await getDb();
  if (db) { await db.delete(branches).where(eq(branches.id, id)); return true; }
  const deleted = store().delete(id);
  if (deleted) persist();
  return deleted;
}
