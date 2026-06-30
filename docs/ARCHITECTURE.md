# Story OS — 技术架构文档

> 版本: 0.1.0-MVP | 日期: 2026-06-26

---

## 1. 技术选型

| 层 | 技术 | 选型理由 |
|---|------|---------|
| 框架 | Next.js 15 App Router | 文件系统路由、Server Components、API Routes 一体化 |
| 语言 | TypeScript (strict) | 类型安全，可维护 |
| 样式 | Tailwind CSS | 快速原型，设计一致性 |
| 数据库 | Supabase (PostgreSQL) | 托管 Postgres，内置 pgvector，RLS 未来可用 |
| 向量存储 | pgvector (via Supabase) | 与业务数据同一数据库，无需额外服务 |
| AI 服务 | DeepSeek API (deepseek-v4-flash / deepseek-reasoner) | OpenAI 兼容、性价比高、中文创作优秀 |
| ORM | Drizzle ORM | 类型安全、轻量、支持 pgvector |
| 编辑器 | textarea + Markdown 预览 | MVP 不引入富文本编辑器 |
| 部署 | Vercel | Next.js 原生支持，免费层够 MVP |

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Story     │  │ Scene     │  │ Character│  │ AI Panel      │   │
│  │ List      │  │ Editor    │  │ Manager  │  │ (Draft/Canon)│   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘   │
└────────┼──────────────┼──────────────┼───────────────┼───────────┘
         │              │              │               │
         ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App Router (Server)                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Page Routes  │  │ API Routes   │  │ Server Components    │  │
│  │              │  │              │  │ (RSC)                │  │
│  │ /stories     │  │ /api/ai/     │  │ - StoryList          │  │
│  │ /stories/[id]│  │ /api/scenes/ │  │ - SceneDetail        │  │
│  │ /scenes/[id] │  │ /api/chars/  │  │ - CharacterPanel     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │               │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐  │
│  │                    Service Layer                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │ Story    │  │ AI       │  │ Context  │  │ Embed    │  │  │
│  │  │ Service  │  │ Service  │  │ Builder  │  │ Service  │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │  │
│  └───────┴─────────────┴────────────┴────────────┴──────────┘  │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │                    Data Layer (Drizzle ORM)              │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL + pgvector)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ stories  │ │ scenes   │ │ characters│ │ scene_embeddings │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ locations│ │ worldfacts│ │ events   │  (+ more tables)       │
│  └──────────┘ └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 路由设计

```
/                           → 首页/故事列表
/stories/new                → 创建新故事
/stories/[id]               → 故事详情（Scene 列表 + 元数据）
/stories/[id]/scenes/new    → 新建 Scene
/scenes/[id]                → Scene 编辑器（核心页面）
/scenes/[id]/drafts         → 该 Scene 的草稿列表
/stories/[id]/characters    → 人物管理页
/stories/[id]/locations     → 地点管理页
/stories/[id]/world         → 世界观设定页
/api/ai/continue            → POST — AI 续写
/api/ai/expand              → POST — AI 扩写
/api/ai/polish              → POST — AI 润色
/api/ai/check-contradiction → POST — AI 矛盾检查
/api/scenes                 → CRUD REST
/api/stories                → CRUD REST
/api/characters             → CRUD REST
/api/embeddings/search      → POST — 向量相似检索
```

---

## 4. 文件结构

```
story-os/
├── AGENTS.md                    # Codex 工作规则
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── AI_MEMORY.md
│   └── ROADMAP.md
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx             # 首页（故事列表）
│   │   ├── stories/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # 故事详情
│   │   │       ├── scenes/new/page.tsx
│   │   │       ├── characters/page.tsx
│   │   │       ├── locations/page.tsx
│   │   │       └── world/page.tsx
│   │   ├── scenes/
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # Scene 编辑器
│   │   │       └── drafts/page.tsx
│   │   └── api/
│   │       ├── ai/
│   │       │   ├── continue/route.ts
│   │       │   ├── expand/route.ts
│   │       │   ├── polish/route.ts
│   │       │   └── check-contradiction/route.ts
│   │       ├── stories/route.ts
│   │       ├── scenes/route.ts
│   │       ├── characters/route.ts
│   │       └── embeddings/search/route.ts
│   ├── lib/                     # 共享库
│   │   ├── db/                  # 数据库
│   │   │   ├── index.ts         # Drizzle 连接
│   │   │   ├── schema.ts        # 表定义
│   │   │   └── migrate.ts       # 迁移
│   │   ├── ai/                  # AI 相关
│   │   │   ├── deepseek.ts      # DeepSeek API 客户端
│   │   │   ├── prompts.ts       # Prompt 模板
│   │   │   └── context-builder.ts  # 上下文构建器
│   │   ├── embeddings/          # 向量相关
│   │   │   ├── generate.ts      # 生成 embedding
│   │   │   └── search.ts        # 相似检索
│   │   ├── services/            # 业务逻辑层
│   │   │   ├── story.service.ts
│   │   │   ├── scene.service.ts
│   │   │   ├── character.service.ts
│   │   │   └── draft.service.ts
│   │   └── utils/               # 工具函数
│   │       ├── text.ts          # 文本处理
│   │       └── markdown.ts      # Markdown 解析
│   ├── components/              # React 组件
│   │   ├── ui/                  # 通用 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Modal.tsx
│   │   ├── story/               # 故事相关组件
│   │   │   ├── StoryList.tsx
│   │   │   ├── StoryCard.tsx
│   │   │   └── SceneList.tsx
│   │   ├── editor/              # 编辑器组件
│   │   │   ├── SceneEditor.tsx
│   │   │   ├── MarkdownPreview.tsx
│   │   │   └── DraftPanel.tsx
│   │   ├── ai/                  # AI 面板组件
│   │   │   ├── AIActionBar.tsx
│   │   │   ├── ContinuePanel.tsx
│   │   │   └── DraftReviewPanel.tsx
│   │   └── character/           # 人物组件
│   │       ├── CharacterList.tsx
│   │       └── CharacterForm.tsx
│   └── types/                   # TypeScript 类型
│       ├── story.ts
│       ├── scene.ts
│       ├── character.ts
│       └── ai.ts
├── supabase/
│   └── migrations/              # 数据库迁移文件
├── tests/                       # 测试
│   ├── unit/
│   └── integration/
├── .env.local                   # 环境变量
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts
└── package.json
```

---

## 5. 数据流

### 5.1 AI 续写流程

```
User clicks "AI Continue"
  → POST /api/ai/continue { sceneId, direction? }
  → Context Builder runs:
      1. Load current scene text (L0)
      2. Load adjacent scenes' summaries (L1)
      3. Vector search for semantically similar scenes (L2)
      4. Load relevant characters & world facts (L3)
      5. Load recent events from event ledger (L4)
  → Assemble prompt with all context
  → Call OpenAI API (streaming)
  → Save result as Draft in DB
  → Return draftId + content to client (streaming SSE)
```

### 5.2 Draft → Canon 流程

```
User reviews Draft → clicks "Approve"
  → POST /api/scenes/{id}/canonize { draftId }
  → Service:
      1. Mark draft.status = 'canon'
      2. Update scene.content with draft content
      3. Generate new embedding for scene content
      4. Update scene summary (call AI to generate)
      5. Extract any new characters/world facts (optional, manual)
      6. Return updated scene
```

---

## 6. 关键设计决策

### 6.1 为什么不用 LangChain？

MVP 阶段 LangChain 是过度工程。直接使用 OpenAI SDK + 自定义 prompt 模板 + 手写上下文构建器，更可控、更透明、更易调试。

### 6.2 为什么用 pgvector 而不是 Pinecone/Weaviate？

- 减少服务数量：Supabase 一站式搞定 Postgres + 向量存储
- 不需要额外付费
- MVP 数据量不大，pgvector 性能足够
- 向量数据与业务数据在同一事务中

### 6.3 为什么用 Drizzle 而不是 Prisma？

- Drizzle 对 pgvector 支持更好
- Drizzle 更轻量、更类型安全
- Drizzle 的 SQL-like API 更透明

### 6.4 为什么不做用户认证？

MVP 目标是验证产品概念——故事管理 + AI 续写 + 多层记忆——用户系统是基础设施，不是核心价值。使用硬编码的 `user_id = 'default'` 或本地环境变量标识。数据结构预留 `user_id` 字段供未来扩展。

---

## 7. 环境变量

```env
# .env.local
DEEPSEEK_API_KEY=sk-xxx
DATABASE_URL=postgresql://...
# MVP 不用的：
# NEXTAUTH_SECRET=
# NEXTAUTH_URL=
```

---

## 8. 依赖清单

```json
{
  "dependencies": {
    "next": "^16",
    "react": "^19",
    "react-dom": "^19",
    "drizzle-orm": "^0.45",
    "drizzle-kit": "^0.31",
    "postgres": "^3",
    "openai": "^6",
    "tailwindcss": "^4"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/pg": "^8",
    "eslint": "^9",
    "vitest": "^4"
  }
}
```
