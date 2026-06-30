-- ============================================================
-- Story OS — Initial Database Migration
-- Target: Supabase (PostgreSQL 15 + pgvector)
-- Version: 0.1.0-MVP
-- Date: 2026-06-26
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";     -- for pgvector

-- ============================================================
-- 1. stories — 故事项目
-- ============================================================
CREATE TABLE stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL DEFAULT 'default',
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  genre         TEXT DEFAULT '',
  world_setting TEXT DEFAULT '',
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stories_user ON stories(user_id);

-- ============================================================
-- 2. branches — 故事分支
-- ============================================================
CREATE TABLE branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id          UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT DEFAULT '',
  parent_branch_id  UUID,  -- self-ref FK added below
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_branches_story ON branches(story_id);
CREATE INDEX idx_branches_parent ON branches(parent_branch_id);

-- Self-referencing foreign key
ALTER TABLE branches
  ADD CONSTRAINT fk_branches_parent
  FOREIGN KEY (parent_branch_id) REFERENCES branches(id)
  ON DELETE SET NULL;

-- ============================================================
-- 3. scenes — 场景 / 故事节点（核心表）
-- ============================================================
CREATE TABLE scenes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  parent_scene_id UUID,  -- self-ref FK added below

  -- 内容
  title           TEXT NOT NULL,
  content         TEXT DEFAULT '',          -- raw_text — 完整原文，唯一真相源

  -- 摘要（仅索引，不可替代原文）
  summary_short   TEXT DEFAULT '',          -- ≤50 字，快速概览
  summary_long    TEXT DEFAULT '',          -- ≤300 字，详细概览

  -- 排序 & 状态
  sort_order      INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'canon', 'archived', 'alternative')),

  -- 元数据
  word_count      INTEGER DEFAULT 0,
  facts_added     JSONB DEFAULT '[]'::jsonb,   -- [{key, value, category}]
  open_threads    JSONB DEFAULT '[]'::jsonb,   -- [{description, status, related_scene_id}]
  meta            JSONB DEFAULT '{}'::jsonb,   -- 通用扩展

  -- 时间戳
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ                -- 软删除
);

CREATE INDEX idx_scenes_story     ON scenes(story_id);
CREATE INDEX idx_scenes_branch    ON scenes(branch_id);
CREATE INDEX idx_scenes_parent    ON scenes(parent_scene_id);
CREATE INDEX idx_scenes_sort      ON scenes(story_id, sort_order);
CREATE INDEX idx_scenes_status    ON scenes(story_id, status);
CREATE INDEX idx_scenes_deleted   ON scenes(deleted_at) WHERE deleted_at IS NOT NULL;

-- Self-referencing foreign key (parent scene in story graph)
ALTER TABLE scenes
  ADD CONSTRAINT fk_scenes_parent
  FOREIGN KEY (parent_scene_id) REFERENCES scenes(id)
  ON DELETE SET NULL;

-- ============================================================
-- 4. drafts — AI 生成草稿
-- ============================================================
CREATE TABLE drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id      UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'default',

  -- AI 生成内容
  content       TEXT NOT NULL,
  ai_action     TEXT NOT NULL
    CHECK (ai_action IN ('continue', 'expand', 'polish', 'compress', 'rewrite', 'check-contradiction')),
  ai_model      TEXT DEFAULT 'deepseek-v4-flash',
  ai_prompt     TEXT DEFAULT '',             -- 完整 prompt（调试/审计用）

  -- 状态
  status        TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'canon', 'rejected')),
  word_count    INTEGER DEFAULT 0,

  -- 时间戳
  created_at    TIMESTAMPTZ DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ
);

CREATE INDEX idx_drafts_scene  ON drafts(scene_id);
CREATE INDEX idx_drafts_status ON drafts(status);

-- ============================================================
-- 5. characters — 人物
-- ============================================================
CREATE TABLE characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'default',

  -- 基本身份
  name          TEXT NOT NULL,
  aliases       TEXT DEFAULT '',             -- 逗号分隔

  -- 人物卡
  description   TEXT DEFAULT '',             -- 一句话描述
  appearance    TEXT DEFAULT '',             -- 外貌
  personality   TEXT DEFAULT '',             -- 性格
  background    TEXT DEFAULT '',             -- 背景故事
  motivations   TEXT DEFAULT '',             -- 动机/目标

  -- 关系网
  relationships JSONB DEFAULT '[]'::jsonb,   -- [{characterId, characterName, relation}]

  -- 标记
  notes         TEXT DEFAULT '',
  is_major      BOOLEAN DEFAULT false,       -- 是否主要角色

  -- 时间戳
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_characters_story ON characters(story_id);
CREATE INDEX idx_characters_major ON characters(story_id, is_major) WHERE is_major = true;

-- ============================================================
-- 6. locations — 地点
-- ============================================================
CREATE TABLE locations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id           UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL DEFAULT 'default',

  name               TEXT NOT NULL,
  description        TEXT DEFAULT '',
  type               TEXT DEFAULT '',        -- 'city' | 'building' | 'natural' | 'realm' | 'other'
  parent_location_id UUID,                   -- self-ref FK added below
  notes              TEXT DEFAULT '',

  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_locations_story ON locations(story_id);
CREATE INDEX idx_locations_type  ON locations(story_id, type);

-- Self-referencing foreign key
ALTER TABLE locations
  ADD CONSTRAINT fk_locations_parent
  FOREIGN KEY (parent_location_id) REFERENCES locations(id)
  ON DELETE SET NULL;

-- ============================================================
-- 7. world_facts — 世界观事实（故事圣经）
-- ============================================================
CREATE TABLE world_facts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL DEFAULT 'default',

  key             TEXT NOT NULL,             -- 事实名称 "魔法系统"
  value           TEXT NOT NULL,             -- 事实内容
  category        TEXT DEFAULT '',           -- 'magic' | 'tech' | 'society' | 'history' | 'rules' | 'character' | 'organization' | 'plot' | 'world'
  source_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- 同一 story 下 key 唯一（可选严格约束）
  UNIQUE (story_id, key)
);

CREATE INDEX idx_worldfacts_story    ON world_facts(story_id);
CREATE INDEX idx_worldfacts_category ON world_facts(story_id, category);

-- ============================================================
-- 8. events — 事件账本（不可变时间线）
-- ============================================================
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  scene_id      UUID REFERENCES scenes(id) ON DELETE SET NULL,

  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  event_time    TEXT DEFAULT '',             -- 故事内时间 "第三纪元 1420 年"
  event_order   INTEGER DEFAULT 0,

  created_at    TIMESTAMPTZ DEFAULT now()
  -- 注意：此表无 updated_at —— 事件记录不可变
);

CREATE INDEX idx_events_story ON events(story_id);
CREATE INDEX idx_events_order ON events(story_id, event_order);
CREATE INDEX idx_events_scene ON events(scene_id);

-- ============================================================
-- 9. foreshadowings — 伏笔追踪
-- ============================================================
CREATE TABLE foreshadowings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id          UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,

  description       TEXT NOT NULL,
  planted_scene_id  UUID REFERENCES scenes(id) ON DELETE SET NULL,
  resolved_scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL,

  status            TEXT DEFAULT 'planted'
    CHECK (status IN ('planted', 'hinted', 'resolved')),

  created_at        TIMESTAMPTZ DEFAULT now(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX idx_foreshadowings_story   ON foreshadowings(story_id);
CREATE INDEX idx_foreshadowings_status  ON foreshadowings(story_id, status);

-- ============================================================
-- 10. scene_characters — Scene ↔ 人物关联（多对多）
-- ============================================================
CREATE TABLE scene_characters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id     UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  role         TEXT DEFAULT 'appears'
    CHECK (role IN ('appears', 'mentioned', 'pov', 'narrator')),
  notes        TEXT DEFAULT ''
);

CREATE UNIQUE INDEX idx_scene_char_unique ON scene_characters(scene_id, character_id);
CREATE INDEX idx_scene_char_scene ON scene_characters(scene_id);
CREATE INDEX idx_scene_char_char  ON scene_characters(character_id);

-- ============================================================
-- 11. scene_embeddings — 向量嵌入（pgvector）
-- Model: text-embedding-3-small (1536 dims)
-- ============================================================
CREATE TABLE scene_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id      UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  chunk_index   INTEGER DEFAULT 0,          -- 分段序号（长 Scene 按 ~800 字分段）
  chunk_text    TEXT NOT NULL,              -- 原文片段
  embedding     vector(1536),               -- OpenAI embedding
  token_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_embeddings_scene ON scene_embeddings(scene_id);

-- IVFFlat 索引（适合 MVP 数据量 < 100K 向量）
-- 注意：IVFFlat 索引需要在表有数据后创建才有效
-- 如果表为空时创建，后续插入数据后需要 REINDEX
CREATE INDEX idx_embeddings_vector ON scene_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- 12. story_settings — 故事级配置
-- ============================================================
CREATE TABLE story_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id                UUID NOT NULL UNIQUE REFERENCES stories(id) ON DELETE CASCADE,
  user_id                 TEXT NOT NULL DEFAULT 'default',

  -- AI 行为偏好
  default_model           TEXT DEFAULT 'deepseek-v4-flash',
  default_temperature     TEXT DEFAULT '0.8',
  style_guide             TEXT DEFAULT '',     -- 文风指南

  -- 结构偏好
  scene_naming_pattern    TEXT DEFAULT 'chapter'
    CHECK (scene_naming_pattern IN ('chapter', 'scene', 'part', 'custom')),

  -- 扩展
  meta                    JSONB DEFAULT '{}'::jsonb,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_story_settings_story ON story_settings(story_id);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_scenes_updated_at
  BEFORE UPDATE ON scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_world_facts_updated_at
  BEFORE UPDATE ON world_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_story_settings_updated_at
  BEFORE UPDATE ON story_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON TABLE stories IS '故事项目';
COMMENT ON TABLE branches IS '故事分支（树形结构，parent_branch_id 自引用）';
COMMENT ON TABLE scenes IS '场景/章节 — 故事图谱的核心节点。content 是唯一真相源，摘要仅用于索引';
COMMENT ON TABLE drafts IS 'AI 生成草稿 — 所有 AI 输出先写入此表，用户确认后才更新 scenes.content';
COMMENT ON TABLE characters IS '人物 — 结构化的人物卡';
COMMENT ON TABLE locations IS '地点 — 世界观地点（树形，parent_location_id 自引用）';
COMMENT ON TABLE world_facts IS '世界观事实 — 故事圣经的结构化条目';
COMMENT ON TABLE events IS '事件账本 — 不可变的事件时间线';
COMMENT ON TABLE foreshadowings IS '伏笔追踪 — 标记和追踪故事伏笔';
COMMENT ON TABLE scene_characters IS 'Scene ↔ 人物多对多关联';
COMMENT ON TABLE scene_embeddings IS '向量嵌入 — OpenAI text-embedding-3-small (1536d)，用于语义检索';
COMMENT ON TABLE story_settings IS '故事级 AI 行为和结构配置';

COMMENT ON COLUMN scenes.content IS 'raw_text — 完整原文，唯一真相源。摘要仅用于索引定位，不得替代原文进行推理';
COMMENT ON COLUMN scenes.summary_short IS '短摘要 ≤50 字 — 索引用，不可替代原文';
COMMENT ON COLUMN scenes.summary_long IS '长摘要 ≤300 字 — 索引用，不可替代原文';
COMMENT ON COLUMN scenes.status IS 'draft=作者草稿 | canon=已确认正史 | archived=已归档 | alternative=平行分支';
COMMENT ON COLUMN scenes.facts_added IS '本 Scene 新增的世界观事实 [{key, value, category}] — AI 提取后用户审核';
COMMENT ON COLUMN scenes.open_threads IS '未闭合叙事线 [{description, status, related_scene_id}]';
COMMENT ON COLUMN drafts.status IS 'draft=待审核 | canon=已确认并写入 scenes | rejected=已废弃';
COMMENT ON COLUMN events.event_time IS '故事内时间（非真实时间），如"第三纪元 1420 年"';
