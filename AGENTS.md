# AGENTS.md — Story OS 项目工作规则

> 本文档定义了 Claude Code / Codex 在本仓库中工作时必须遵守的规则。
> 违反这些规则可能导致代码与项目架构不一致。

---

## 1. 产品原则

Story OS 不是一个通用的 AI 写作工具。所有设计和实现必须服务于以下核心价值：

1. **长期故事记忆** — 系统必须能跨越远超 AI 上下文窗口的故事长度，保持人物、设定、情节的一致性
2. **分支管理** — 故事不是线性文档，而是有向图；数据结构必须支持分支和分叉
3. **一致性检查** — AI 生成内容必须与已有设定进行矛盾检测
4. **作者控制权** — AI 是辅助工具，不是替代作者。所有 AI 输出必须先进入草稿状态，只有用户确认后才成为正史
5. **原文不可替代** — **摘要只是索引，不是真相源。** 原始文本永远不能被摘要替换。AI 进行上下文推理时，摘要用于定位，原文用于引用

---

## 2. 核心原则

### 2.1 MVP 优先

- **不得过度工程化**。在 MVP 阶段，选择最简单的可行方案，不要为未来需求提前建造基础设施。
- 如果一个问题可以用 20 行代码解决，不要引入一个新库。
- 数据结构预留扩展字段（`meta JSONB`, `facts_added JSONB`, `open_threads JSONB`），但功能代码只实现当下需要的。

### 2.2 Draft/Canon 铁律

> **所有 AI 生成的内容必须先写为 Draft，永远不要直接将 AI 输出写入 Canon 表。**

- AI API 的返回值 → `drafts` 表（status = 'draft'）
- 用户点击确认 → 更新 `drafts.status = 'canon'` + 更新 `scenes.content`
- 用户废弃 → 更新 `drafts.status = 'rejected'`
- Scene 有四种状态：`draft`（作者草稿）| `canon`（已确认正史）| `archived`（已归档/废弃分支）| `alternative`（平行分支，非主线）
- 永远不要在 `scenes.content` 中直接写入 AI 生成的内容

### 2.3 原文不可替代

> **摘要只是索引，不是真相源。Summaries are indexes, not source of truth.**

- 任何检索、上下文构建、AI 推理流程中，摘要的作用是**定位**相关 Scene
- 一旦通过摘要定位到 Scene，必须从 `scenes.content`（原文）中提取实际内容注入 prompt
- 绝对不允许用摘要代替原文进行 AI 推理或矛盾检查
- 也不允许在用户界面中用 AI 摘要替换原文显示

### 2.4 避免隐藏副作用

- 函数应该有明确的输入和输出，不应修改全局状态或外部系统的数据而不声明
- AI 调用不应在用户不知情的情况下修改数据库
- AI 自动提取的事实/人物/事件必须先写入临时区域，用户审核后才能保存

### 2.5 AI 提取事实的验证

> **Add validation before saving AI-extracted facts.**

- AI 从文本中自动提取的人物、地点、事件、世界观事实 → 存入 `drafts` 表或带 `pending` 标记的临时记录
- 用户审核确认后 → 才写入对应的正式表（`characters`、`locations`、`world_facts`、`events`）
- 验证规则：事实不能与已有 Canon 设定矛盾；来源 Scene 必须存在且为 Canon 状态

### 2.6 文件结构规则

- `src/lib/` — 纯逻辑，不依赖 React
- `src/components/` — React 组件，按功能域分文件夹
- `src/app/` — Next.js 路由，只做路由层，不写业务逻辑
- `src/types/` — 共享 TypeScript 类型
- 不要在 `src/app/` 中写业务服务或数据库查询，封装到 `src/lib/services/`

### 2.7 类型安全

- TypeScript 严格模式 (`strict: true`)
- 禁止 `any` 类型（除非明确标记为 `// TODO: type me` 且有充分理由）
- 数据库查询结果必须定义明确类型
- API 路由的 request/response 必须定义接口类型

---

## 2. 代码规范

### 2.1 命名约定

| 对象 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `context-builder.ts` |
| 组件文件 | PascalCase | `DraftReviewPanel.tsx` |
| 函数/变量 | camelCase | `buildContinueContext` |
| 类型/接口 | PascalCase | `Story`, `SceneWithCharacters` |
| 数据库表 | snake_case | `world_facts`, `scene_embeddings` |
| 数据库列 | snake_case | `parent_scene_id`, `short_summary` |
| API 路由 | kebab-case 目录 | `/api/check-contradiction/` |

### 2.2 组件结构

```typescript
// 1. imports (外部库 → 内部模块 → 类型 → 组件)
// 2. types/interfaces
// 3. component function
// 4. helper functions (如果不复杂，内联)
// 5. export
```

### 2.3 服务层规范

所有数据库操作必须通过 Service 层，组件和 API Route 不直接导入 Drizzle 或执行查询：

```typescript
// ✅ 正确
import { storyService } from "@/lib/services/story.service";
const stories = await storyService.listAll();

// ❌ 错误
import { db } from "@/lib/db";
const stories = await db.select().from(storiesTable);
```

### 2.4 错误处理

- API Route 必须 `try/catch` 并返回合适的 HTTP 状态码
- AI 调用失败必须返回用户可理解的错误信息（不是原始 error message）
- 数据库错误日志记录到 `console.error`，不要暴露给前端

---

## 3. AI 相关规则

### 3.1 Prompt 管理

- 所有 prompt 模板集中在 `src/lib/ai/prompts.ts`
- 不要在组件或 API Route 中硬编码 prompt 字符串
- prompt 模板使用参数化注入，不使用字符串拼接
- 修改 prompt 模板时，必须同时更新 AI_MEMORY.md 中的文档

### 3.2 OpenAI 调用

- 所有 OpenAI API 调用通过 `src/lib/ai/openai.ts` 的封装函数
- 不要在代码中直接 `new OpenAI()` 或 `openai.chat.completions.create()`
- 流式输出使用 SSE 标准格式
- API Key 只能从 `process.env.OPENAI_API_KEY` 读取

### 3.3 Embedding

- 统一使用 `text-embedding-3-small` 模型（1536 维）
- 不要在代码中硬编码维度数字，使用常量 `EMBEDDING_DIM = 1536`

---

## 4. 数据库规则

### 4.1 Schema 变更

- 任何表结构变更必须先更新 `docs/DATA_MODEL.md`
- 然后更新 `src/lib/db/schema.ts`（Drizzle 定义）
- 然后生成迁移：`npx drizzle-kit generate`
- 审查迁移 SQL 无误后执行：`npx drizzle-kit push`
- 迁移文件提交到 Git（`supabase/migrations/`）

### 4.2 查询规范

- 使用 Drizzle 的 query builder，不写原始 SQL（除非 Drizzle 不支持）
- 查询必须指定需要的列，不使用 `SELECT *`
- 涉及多张表的查询必须考虑 N+1 问题

### 4.3 MVP 用户 ID

- MVP 阶段所有 `user_id` 使用 `'default'`
- 在代码中使用常量 `DEFAULT_USER_ID = 'default'`
- 不要在多个地方硬编码字符串

---

## 5. 测试规则

### 5.1 必须测试的

- 所有 Service 层的函数（`src/lib/services/*.ts`）
- Context Builder 的输出正确性
- Draft → Canon 的状态转换逻辑

### 5.2 可以不测试的（MVP）

- React 组件的渲染（UI 变化频繁）
- OpenAI API 调用（使用 mock）
- 简单的 CRUD API Route（逻辑在 Service 中测试）

### 5.3 测试工具

- 测试框架：Vitest
- 数据库测试：使用测试数据库或 mock
- AI 层测试：使用 mock OpenAI 响应

---

## 6. Git 规则

### 6.1 Commit 信息

遵循 conventional commits：

```
feat: AI continue writing with draft workflow
feat(scene): add auto-save on editor
fix: prevent duplicate embeddings on re-canonize
docs: update AI memory layer design
refactor: extract context builder to separate module
```

### 6.2 分支策略

- `main` — 可运行的最新版本
- `feat/<feature-name>` — 功能开发分支
- `fix/<bug-name>` — 修 bug

---

## 7. 禁止事项

1. ❌ 不要在组件中直接调用 OpenAI API
2. ❌ 不要在 API Route 中写超过 20 行的业务逻辑
3. ❌ 不要引入新依赖而未在 ARCHITECTURE.md 中记录
4. ❌ 不要修改数据库 schema 而未更新文档
5. ❌ 不要将 AI 输出直接写入 `scenes.content`
6. ❌ 不要硬编码用户 ID 为字符串 `'default'`（用常量）
7. ❌ 不要在前端暴露 `OPENAI_API_KEY`
8. ❌ 不要使用 `any` 类型
9. ❌ 不要跳过 TypeScript 严格检查（`// @ts-ignore` 仅在极端情况下允许且必须注释原因）
10. ❌ 不要创建超过 200 行的单个文件（超过则拆分）

---

## 8. 开发工作流

实现复杂功能前，必须遵循以下流程：

```
1. Inspect existing files   — 先阅读相关代码，理解现有架构
2. Propose a short plan     — 在实现前用几句话描述方案（复杂功能可写入 plan 文件）
3. Make small changes       — 每次只修改一个逻辑单元，不使用巨大的 commit
4. Run typecheck/lint/tests — 确保改动不破坏现有代码（如果测试已配置）
5. Summarize changed files and remaining risks — 完成后列出改了什么、还有什么风险
```

### 8.1 新功能开发流程

```
1. 确认功能在 ROADMAP.md 的当前 Phase 中
2. 如果需要新建表 → 更新 DATA_MODEL.md → 更新 schema.ts → 生成迁移
3. 创建 Service 函数 → 编写单元测试
4. 创建 API Route → 集成路由
5. 创建前端组件/页面
6. 手动端到端验证
7. Commit with conventional commit message
```

### 8.2 Bug 修复流程

```
1. 定位 bug → 在 Service 层写一个失败的测试用例
2. 修复代码 → 测试通过
3. 如果是设计缺陷 → 更新相关文档
4. Commit
```

---

## 9. 文档同步

以下文档必须与代码保持同步：

| 文档 | 何时更新 |
|------|---------|
| `docs/DATA_MODEL.md` | 数据库 schema 变更时 |
| `docs/AI_MEMORY.md` | prompt 模板或上下文构建逻辑变更时 |
| `docs/ARCHITECTURE.md` | 技术选型或文件结构变更时 |
| `docs/ROADMAP.md` | 完成 Phase 或调整计划时 |
| `AGENTS.md`（本文件） | 发现新的规则或反模式时 |

---

## 10. 快速检查清单

在提交 PR 或合并前，确认：

- [ ] TypeScript 编译无错误 (`npx tsc --noEmit`)
- [ ] 所有 Service 函数有对应的单元测试
- [ ] AI 返回值写入 `drafts` 表而非 `scenes` 表
- [ ] 新的数据库列已添加到 Drizzle schema
- [ ] API Route 有适当的错误处理
- [ ] 没有硬编码的魔法数字/字符串（使用常量）
- [ ] 文件长度 ≤ 200 行（超过则合理拆分）
- [ ] 相关文档已更新
