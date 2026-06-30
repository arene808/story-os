// ============================================================
// Story OS 鈥?Event Service (globalThis-backed)
// ============================================================

import { getDb, events, safeGetById } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { StoryEvent } from "@/types";
import { mockEvents } from "@/lib/mock-data";
import { seedFromFile, saveStore } from "@/lib/store/file-store";

const GK = "__story_os_event_store__";
const FN = "events.json";

function store(): Map<string, StoryEvent> {
  const g = globalThis as Record<string, unknown>;
  if (!g[GK]) {
    g[GK] = new Map<string, StoryEvent>();
    seedFromFile(FN, g[GK] as Map<string, StoryEvent>, mockEvents);
  }
  return g[GK] as Map<string, StoryEvent>;
}
function persist() { saveStore(FN, store()); }

function rowToEvent(row: typeof events.$inferSelect): StoryEvent {
  return { id: row.id, storyId: row.storyId, sceneId: row.sceneId ?? null, title: row.title, description: row.description ?? "", eventTime: row.eventTime ?? "", eventOrder: row.eventOrder ?? 0, createdAt: (row.createdAt ?? new Date()).toISOString() };
}

export async function listByStory(storyId: string): Promise<StoryEvent[]> {
  const db = await getDb();
  if (db) { return (await db.select().from(events).where(eq(events.storyId, storyId)).orderBy(events.eventOrder)).map(rowToEvent); }
  return Array.from(store().values()).filter((e) => e.storyId === storyId).sort((a, b) => a.eventOrder - b.eventOrder);
}

export async function create(input: { storyId: string; sceneId?: string; title: string; description?: string; eventTime?: string; eventOrder?: number }): Promise<StoryEvent> {
  const db = await getDb();
  if (db) {
    const maxOrder = input.eventOrder ?? Math.max(0, ...((await listByStory(input.storyId)).map(e => e.eventOrder))) + 1;
    const rows = await db.insert(events).values({ storyId: input.storyId, sceneId: input.sceneId ?? null, title: input.title, description: input.description ?? "", eventTime: input.eventTime ?? "", eventOrder: maxOrder }).returning();
    return rowToEvent(rows[0]);
  }
  const now = new Date().toISOString();
  const maxOrder = input.eventOrder ?? Math.max(0, ...Array.from(store().values()).filter(e => e.storyId === input.storyId).map(e => e.eventOrder)) + 1;
  const ev: StoryEvent = { id: `mem-ev-${Date.now()}`, storyId: input.storyId, sceneId: input.sceneId ?? null, title: input.title, description: input.description ?? "", eventTime: input.eventTime ?? "", eventOrder: maxOrder, createdAt: now };
  store().set(ev.id, ev);
  persist();
  return ev;
}
