// ============================================================
// Story OS — Drizzle ORM Schema
// 12 tables covering the full story graph, characters,
// world facts, events, embeddings, and the draft/canon workflow.
// ============================================================

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  foreignKey,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// -----------------------------------------------------------
// 1. stories
// -----------------------------------------------------------
export const stories = pgTable(
  "stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().default("default"),
    title: text("title").notNull(),
    description: text("description").default(""),
    genre: text("genre").default(""),
    worldSetting: text("world_setting").default(""),
    status: text("status").default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_stories_user").on(table.userId)]
);

// -----------------------------------------------------------
// 2. branches
// -----------------------------------------------------------
export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").default(""),
    branchType: text("branch_type").default("mainline"),
    parentBranchId: uuid("parent_branch_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_branches_story").on(table.storyId)]
);

// -----------------------------------------------------------
// 3. scenes
// -----------------------------------------------------------
export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id),
    parentSceneId: uuid("parent_scene_id"),

    title: text("title").notNull(),
    content: text("content").default(""),

    summaryShort: text("summary_short").default(""),
    summaryLong: text("summary_long").default(""),

    sortOrder: integer("sort_order").default(0),
    status: text("status").default("draft"),

    wordCount: integer("word_count").default(0),
    factsAdded: jsonb("facts_added").default(sql`'[]'::jsonb`),
    openThreads: jsonb("open_threads").default(sql`'[]'::jsonb`),
    meta: jsonb("meta").default(sql`'{}'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_scenes_story").on(table.storyId),
    index("idx_scenes_branch").on(table.branchId),
    index("idx_scenes_parent").on(table.parentSceneId),
    index("idx_scenes_sort").on(table.storyId, table.sortOrder),
    index("idx_scenes_status").on(table.storyId, table.status),
    index("idx_scenes_deleted")
      .on(table.deletedAt)
      .where(sql`deleted_at IS NOT NULL`),
  ]
);

// -----------------------------------------------------------
// 4. drafts
// -----------------------------------------------------------
export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().default("default"),

    content: text("content").notNull(),
    aiAction: text("ai_action").notNull(),
    aiModel: text("ai_model").default("deepseek-v4-flash"),
    aiPrompt: text("ai_prompt").default(""),

    status: text("status").default("draft"),
    wordCount: integer("word_count").default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_drafts_scene").on(table.sceneId),
    index("idx_drafts_status").on(table.status),
  ]
);

// -----------------------------------------------------------
// 5. characters
// -----------------------------------------------------------
export const characters = pgTable(
  "characters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().default("default"),

    name: text("name").notNull(),
    aliases: text("aliases").default(""),

    description: text("description").default(""),
    appearance: text("appearance").default(""),
    personality: text("personality").default(""),
    background: text("background").default(""),
    motivations: text("motivations").default(""),

    relationships: jsonb("relationships").default(sql`'[]'::jsonb`),

    notes: text("notes").default(""),
    isMajor: boolean("is_major").default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_characters_story").on(table.storyId)]
);

// -----------------------------------------------------------
// 6. locations
// -----------------------------------------------------------
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().default("default"),

    name: text("name").notNull(),
    description: text("description").default(""),
    type: text("type").default(""),
    parentLocationId: uuid("parent_location_id"),
    notes: text("notes").default(""),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_locations_story").on(table.storyId)]
);

// -----------------------------------------------------------
// 7. world_facts
// -----------------------------------------------------------
export const worldFacts = pgTable(
  "world_facts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().default("default"),

    key: text("key").notNull(),
    value: text("value").notNull(),
    category: text("category").default(""),
    sourceSceneId: uuid("source_scene_id").references(() => scenes.id),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_worldfacts_story").on(table.storyId),
    index("idx_worldfacts_category").on(table.storyId, table.category),
  ]
);

// -----------------------------------------------------------
// 8. events
// -----------------------------------------------------------
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    sceneId: uuid("scene_id").references(() => scenes.id),

    title: text("title").notNull(),
    description: text("description").default(""),
    eventTime: text("event_time").default(""),
    eventOrder: integer("event_order").default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_events_story").on(table.storyId),
    index("idx_events_order").on(table.storyId, table.eventOrder),
  ]
);

// -----------------------------------------------------------
// 9. foreshadowings
// -----------------------------------------------------------
export const foreshadowings = pgTable(
  "foreshadowings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),

    description: text("description").notNull(),
    plantedSceneId: uuid("planted_scene_id").references(() => scenes.id),
    resolvedSceneId: uuid("resolved_scene_id").references(() => scenes.id),
    status: text("status").default("planted"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("idx_foreshadowings_story").on(table.storyId)]
);

// -----------------------------------------------------------
// 10. scene_characters
// -----------------------------------------------------------
export const sceneCharacters = pgTable(
  "scene_characters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    role: text("role").default("appears"),
    notes: text("notes").default(""),
  },
  (table) => [
    uniqueIndex("idx_scene_char_unique").on(table.sceneId, table.characterId),
    index("idx_scene_char_scene").on(table.sceneId),
    index("idx_scene_char_char").on(table.characterId),
  ]
);

// -----------------------------------------------------------
// 11. scene_embeddings
// MVP: uses text for embedding (pgvector not yet available)
// -----------------------------------------------------------
export const sceneEmbeddings = pgTable(
  "scene_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").default(0),
    chunkText: text("chunk_text").notNull(),
    embedding: text("embedding"),
    tokenCount: integer("token_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_embeddings_scene").on(table.sceneId)]
);

// -----------------------------------------------------------
// 12. story_settings
// -----------------------------------------------------------
export const storySettings = pgTable(
  "story_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .unique()
      .references(() => stories.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().default("default"),

    defaultModel: text("default_model").default("deepseek-v4-flash"),
    defaultTemperature: text("default_temperature").default("0.8"),
    styleGuide: text("style_guide").default(""),

    sceneNamingPattern: text("scene_naming_pattern").default("chapter"),

    meta: jsonb("meta").default(sql`'{}'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_story_settings_story").on(table.storyId)]
);
