# Story OS — 数据模型文档

> 版本: 0.1.0-MVP | 日期: 2026-06-26

---

## 1. 设计原则

1. **预留多用户**：所有表包含 `user_id`，MVP 硬编码为 `'default'`，未来启用 RLS
2. **预留分支**：Scene 包含 `branch_id` 和 `parent_scene_id`，MVP 线性使用时均为 null
3. **Draft/Canon 分离**：AI 生成内容写入 `drafts` 表，确认后写入 `scenes` 表
4. **原文是唯一真相源**：`summary_short` / `summary_long` 仅是索引，用于快速定位 Scene；任何推理和引用必须回到 `content` 原文
5. **AI 提取事实先审核**：AI 自动提取的事实存入 `facts_added` (JSONB)，用户确认后才写入正式表 (`world_facts`, `characters`, `events` 等)
6. **向量与业务数据同在**：embedding 存储在独立表，通过 `scene_id` 关联
7. **软删除优先**：关键数据用 `deleted_at` 标记，不做物理删除

---

## 2. 核心表结构

### 2.1 stories — 故事项目

```sql
CREATE TABLE stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL DEFAULT 'default',
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  genre         TEXT DEFAULT '',          -- 类型标签，逗号分隔
  world_setting TEXT DEFAULT '',          -- 一句话世界观
  status        TEXT DEFAULT 'active',    -- 'active' | 'archived'
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stories_user ON stories(user_id);
```

### 2.2 branches — 故事分支（MVP 建表不用）

```sql
CREATE TABLE branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,            -- 分支名称，如 "主线"、"IF 线"
  description   TEXT DEFAULT '',
  parent_branch_id UUID REFERENCES branches(id), -- 分支来源
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_branches_story ON branches(story_id);
```

### 2.3 scenes — 场景/章节（故事节点）

```sql
CREATE TABLE scenes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id),       -- MVP: NULL
  parent_scene_id UUID REFERENCES scenes(id),          -- 上一个节点
  title           TEXT NOT NULL,
  content         TEXT DEFAULT '',                      -- Canon 正文 (MVP 字段名，对应概念 raw_text)
  summary_short   TEXT DEFAULT '',                      -- 一句话摘要（~50字，索引用，不可替代原文）
  summary_long    TEXT DEFAULT '',                      -- 详细摘要（~300字，索引用，不可替代原文）
  sort_order      INTEGER DEFAULT 0,                   -- 排序序号
  status          TEXT DEFAULT 'draft',                -- 'draft' | 'canon' | 'archived' | 'alternative'
  word_count      INTEGER DEFAULT 0,
  facts_added     JSONB DEFAULT '[]',                  -- 本 Scene 新增的世界观事实 [{key, value, category}]
  open_threads    JSONB DEFAULT '[]',                  -- 未闭合的叙事线 [{description, status, related_scene_id}]
  meta            JSONB DEFAULT '{}',                  -- 扩展元数据 (characters, locations, events 等引用)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ                          -- 软删除
);

CREATE INDEX idx_scenes_story     ON scenes(story_id);
CREATE INDEX idx_scenes_branch    ON scenes(branch_id);
CREATE INDEX idx_scenes_parent    ON scenes(parent_scene_id);
CREATE INDEX idx_scenes_sort      ON scenes(story_id, sort_order);
CREATE INDEX idx_scenes_deleted   ON scenes(deleted_at) WHERE deleted_at IS NOT NULL;
```

### 2.4 drafts — AI 生成草稿

```sql
CREATE TABLE drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id      UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'default',
  content       TEXT NOT NULL,                          -- AI 生成内容
  ai_action     TEXT NOT NULL,                          -- 'continue' | 'expand' | 'polish' | 'compress' | 'rewrite'
  ai_model      TEXT DEFAULT 'deepseek-v4-flash',      -- 使用的模型
  ai_prompt     TEXT DEFAULT '',                        -- 发送给 AI 的完整 prompt（调试用）
  status        TEXT DEFAULT 'draft',                   -- 'draft' | 'canon' | 'rejected'
  word_count    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,                            -- 确认时间
  rejected_at   TIMESTAMPTZ                             -- 废弃时间
);

CREATE INDEX idx_drafts_scene  ON drafts(scene_id);
CREATE INDEX idx_drafts_status ON drafts(status);
```

### 2.5 characters — 人物

```sql
CREATE TABLE characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'default',
  name          TEXT NOT NULL,
  aliases       TEXT DEFAULT '',                        -- 别名/绰号，逗号分隔
  description   TEXT DEFAULT '',                        -- 一句话描述
  appearance    TEXT DEFAULT '',                        -- 外貌
  personality   TEXT DEFAULT '',                        -- 性格
  background    TEXT DEFAULT '',                        -- 背景故事
  motivations   TEXT DEFAULT '',                        -- 动机/目标
  relationships JSONB DEFAULT '[]',                    -- 关系列表 [{"character_id":"...","relation":"盟友"}]
  notes         TEXT DEFAULT '',
  is_major      BOOLEAN DEFAULT false,                  -- 是否主要角色
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_characters_story ON characters(story_id);
```

### 2.6 locations — 地点

```sql
CREATE TABLE locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'default',
  name          TEXT NOT NULL,
  description   TEXT DEFAULT '',
  type          TEXT DEFAULT '',                        -- 'city' | 'building' | 'natural' | 'realm' | etc
  parent_location_id UUID REFERENCES locations(id),    -- 子地点
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_locations_story ON locations(story_id);
```

### 2.7 world_facts — 世界观事实（故事圣经）

```sql
CREATE TABLE world_facts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL DEFAULT 'default',
  key           TEXT NOT NULL,                          -- 事实名称，如 "魔法系统"
  value         TEXT NOT NULL,                          -- 事实内容
  category      TEXT DEFAULT '',                        -- 'magic' | 'tech' | 'society' | 'history' | 'rules'
  source_scene_id UUID REFERENCES scenes(id),           -- 来源于哪个 Scene
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_worldfacts_story    ON world_facts(story_id);
CREATE INDEX idx_worldfacts_category ON world_facts(story_id, category);
```

### 2.8 events — 事件账本（不可变时间线）

```sql
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id      UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  scene_id      UUID REFERENCES scenes(id),            -- 发生在哪个 Scene
  title         TEXT NOT NULL,                          -- 事件名称
  description   TEXT DEFAULT '',                        -- 事件描述
  event_time    TEXT DEFAULT '',                        -- 故事内时间，如 "第三纪元 1420 年"
  event_order   INTEGER DEFAULT 0,                      -- 时间线排序
  created_at    TIMESTAMPTZ DEFAULT now()
  -- 不可变：无 updated_at，不允许 UPDATE
);

CREATE INDEX idx_events_story ON events(story_id);
CREATE INDEX idx_events_order ON events(story_id, event_order);
```

### 2.9 foreshadowings — 伏笔追踪

```sql
CREATE TABLE foreshadowings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,                        -- 伏笔内容
  planted_scene_id UUID REFERENCES scenes(id),          -- 埋下伏笔的 Scene
  resolved_scene_id UUID REFERENCES scenes(id),         -- 揭示伏笔的 Scene
  status          TEXT DEFAULT 'planted',               -- 'planted' | 'hinted' | 'resolved'
  created_at      TIMESTAMPTZ DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX idx_foreshadowings_story ON foreshadowings(story_id);
```

### 2.10 scene_characters — Scene 与人物关联

```sql
CREATE TABLE scene_characters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id      UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'appears',                 -- 'appears' | 'mentioned' | 'pov' | 'narrator'
  notes         TEXT DEFAULT ''
);

CREATE UNIQUE INDEX idx_scene_char_unique ON scene_characters(scene_id, character_id);
```

### 2.11 scene_embeddings — 向量嵌入（pgvector）

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE scene_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id      UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  chunk_index   INTEGER DEFAULT 0,                      -- 分段序号（长 Scene 分段）
  chunk_text    TEXT NOT NULL,                          -- 原文片段
  embedding     vector(1536),                           -- text-embedding-3-small
  token_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat 索引（适合 MVP 数据量）
CREATE INDEX idx_embeddings_vector ON scene_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

### 2.12 story_settings — 故事级配置

```sql
CREATE TABLE story_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id              UUID NOT NULL UNIQUE REFERENCES stories(id) ON DELETE CASCADE,
  user_id               TEXT NOT NULL DEFAULT 'default',
  default_model         TEXT DEFAULT 'deepseek-v4-flash',
  default_temperature   TEXT DEFAULT '0.8',
  style_guide           TEXT DEFAULT '',
  scene_naming_pattern  TEXT DEFAULT 'chapter'
    CHECK (scene_naming_pattern IN ('chapter', 'scene', 'part', 'custom')),
  meta                  JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_story_settings_story ON story_settings(story_id);
```

---

## 3. CHECK 约束汇总

所有 `status` 字段使用 CHECK 约束保证数据完整性：

| 表 | 字段 | 约束值 |
|----|------|--------|
| stories | status | `'active'`, `'archived'` |
| scenes | status | `'draft'`, `'canon'`, `'archived'`, `'alternative'` |
| drafts | status | `'draft'`, `'canon'`, `'rejected'` |
| drafts | ai_action | `'continue'`, `'expand'`, `'polish'`, `'compress'`, `'rewrite'`, `'check-contradiction'` |
| foreshadowings | status | `'planted'`, `'hinted'`, `'resolved'` |
| scene_characters | role | `'appears'`, `'mentioned'`, `'pov'`, `'narrator'` |
| story_settings | scene_naming_pattern | `'chapter'`, `'scene'`, `'part'`, `'custom'` |

---

## 4. 自动触发器

所有含 `updated_at` 的表都有自动更新触发器：

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 应用于: stories, scenes, characters, locations, world_facts, story_settings
```

注意：`drafts`、`events`、`foreshadowings`、`scene_embeddings` 不使用此触发器：
- `drafts` 有独立的 `confirmed_at` / `rejected_at` 时间戳
- `events` 是不可变记录，无 `updated_at`
- `scene_embeddings` 写入后不变

---

## 5. 实体关系图 (ERD)

```
stories ──1:N──> branches ──1:N──> scenes
stories ──1:N──> characters
stories ──1:N──> locations
stories ──1:N──> world_facts
stories ──1:N──> events
stories ──1:N──> foreshadowings

scenes ──1:N──> drafts
scenes ──1:N──> scene_embeddings
scenes ──1:N──> scene_characters ──N:1──> characters
scenes ──1:N──> events (via scene_id)
scenes ──1:N──> foreshadowings (via planted_scene_id / resolved_scene_id)

scenes ──1:1──> scenes (parent_scene_id 自引用，构建链表/树)
branches ──1:1──> branches (parent_branch_id 自引用)
locations ──1:1──> locations (parent_location_id 自引用)
```

---

## 6. Drizzle Schema 文件

完整的 Drizzle ORM schema 定义参见 [`src/lib/db/schema.ts`](../src/lib/db/schema.ts)。

首次迁移 SQL 文件: [`supabase/migrations/0000_initial.sql`](../supabase/migrations/0000_initial.sql)。

---

## 7. 数据迁移策略

1. **MVP 阶段**：使用 Drizzle Kit 管理迁移：`npx drizzle-kit generate` 生成 → `npx drizzle-kit push` 同步到 Supabase
2. **手动执行**：也可以直接在 Supabase SQL Editor 中执行 `supabase/migrations/0000_initial.sql`
3. **未来**：CI/CD 中集成 `npx drizzle-kit migrate` 自动执行迁移
4. **回滚**：MVP 不做自动回滚，手动备份 + 手动恢复

---

## 8. MVP 简化说明

以下表在 MVP 阶段建表但 UI 不暴露（或仅做简单 CRUD）：

- `branches`：建表，MVP 线性故事不用，字段预留
- `foreshadowings`：建表，MVP 手动添加伏笔，AI 不自动检测
- `events`：建表，MVP 手动添加事件
- `scene_characters`：建表，MVP 手动关联
- `story_settings`：建表，MVP 预留

MVP 核心使用的表：`stories`、`scenes`、`drafts`、`characters`、`scene_embeddings`

---

## 9. RLS 预留

MVP 不使用 RLS（单用户模式），但表设计已包含 `user_id` 字段。未来启用 RLS 时只需：

```sql
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own stories"
  ON stories FOR ALL USING (auth.uid() = user_id);
-- 对其他表重复类似操作
```
