# Story OS — MVP 开发路线图

> 版本: 0.1.0-MVP | 日期: 2026-06-26

---

## 概述

MVP 目标：一个单用户可用的故事创作工具，支持创建故事 → 管理 Scene → AI 续写/扩写/润色 → Draft/Canon 审核流程 → 基础人物管理。

MVP 时间估算：约 4-6 周（兼职开发）。

---

## Phase 0: 项目初始化（Day 1-2）

### 任务

- [ ] **P0-1**: 初始化 Next.js 15 项目（`npx create-next-app@latest`）
  - TypeScript, Tailwind CSS, App Router, src/ 目录
- [ ] **P0-2**: 配置 Drizzle ORM + Supabase 连接
  - 安装依赖，配置 `DATABASE_URL`
  - 创建 `src/lib/db/index.ts` 和 `schema.ts`
- [ ] **P0-3**: 运行首次数据库迁移
  - 创建所有表（stories, scenes, drafts, characters, scene_embeddings）
  - 启用 pgvector 扩展
- [ ] **P0-4**: 配置 OpenAI SDK
  - 创建 `src/lib/ai/openai.ts`
  - 测试 API 连通性
- [ ] **P0-5**: 创建 `.env.local.example` 和项目 README

**完成标准**：`npm run dev` 正常启动，数据库连接正常，OpenAI API 可调用。

---

## Phase 1: 故事管理基础（Day 3-5）

### 任务

- [ ] **P1-1**: 实现 Story CRUD
  - `src/lib/services/story.service.ts` — create, getById, listAll, update, delete
  - `src/app/api/stories/route.ts` — GET (list), POST (create)
  - `src/app/api/stories/[id]/route.ts` — GET, PATCH, DELETE
- [ ] **P1-2**: 故事列表页
  - `src/app/page.tsx` — 显示所有故事，空状态引导
  - `src/components/story/StoryCard.tsx`
  - 创建故事按钮 → 弹窗或跳转新建页
- [ ] **P1-3**: 故事详情页
  - `src/app/stories/[id]/page.tsx` — 显示故事信息 + Scene 列表
  - Scene 按 sort_order 排序显示
  - 空状态：引导创建第一个 Scene
- [ ] **P1-4**: 基础 UI 组件
  - Button, Card, Textarea, Modal, Input 等通用组件

**完成标准**：可以创建故事 → 进入故事详情 → 看到空的 Scene 列表。

---

## Phase 2: Scene 编辑器（Day 6-10）

### 任务

- [ ] **P2-1**: 实现 Scene CRUD
  - `src/lib/services/scene.service.ts`
  - `src/app/api/scenes/route.ts` — POST
  - `src/app/api/scenes/[id]/route.ts` — GET, PATCH, DELETE
- [ ] **P2-2**: Scene 编辑器页面
  - `src/app/scenes/[id]/page.tsx` — 核心编辑页
  - 左侧：textarea 编辑器（大文本区域）
  - 右侧：Markdown 实时预览
  - 顶部：Scene 标题编辑 + 返回按钮
- [ ] **P2-3**: 自动保存
  - 用户停止输入 2 秒后自动保存到数据库
  - 显示"已保存"状态指示
- [ ] **P2-4**: Scene 排序
  - Scene 列表页支持手动调整 sort_order
  - MVP: 上下移动按钮（不做拖拽）

**完成标准**：可以创建 Scene → 输入/粘贴文字 → 自动保存 → 查看 Markdown 预览。

---

## Phase 3: AI 续写与 Draft 系统（Day 11-18）

### 任务

- [ ] **P3-1**: Context Builder
  - `src/lib/ai/context-builder.ts`
  - 实现 L0（原文 + 上文）+ L1（相邻摘要）+ L3（人物卡）注入
  - MVP 暂不包含 L2（向量检索）和 L4（事件账本）
- [ ] **P3-2**: Prompt 模板
  - `src/lib/ai/prompts.ts`
  - 续写、扩写、润色、压缩、改写风格 5 种 prompt
- [ ] **P3-3**: AI 续写 API
  - `src/app/api/ai/continue/route.ts`
  - 收集上下文 → 拼接 prompt → 调用 OpenAI → 流式返回
  - 结果自动保存为 Draft
- [ ] **P3-4**: AI 扩写 API
  - `src/app/api/ai/expand/route.ts`
  - 选中文字 + 上下文 → 扩写 → 流式返回
- [ ] **P3-5**: AI 润色 API
  - `src/app/api/ai/polish/route.ts`
- [ ] **P3-6**: Draft 服务
  - `src/lib/services/draft.service.ts`
  - create, getBySceneId, approve (promote to canon), reject
- [ ] **P3-7**: Draft 审核 UI
  - `src/components/ai/DraftReviewPanel.tsx`
  - 显示 AI 生成内容 → 对比原文 → 确认/编辑/废弃
- [ ] **P3-8**: AI 操作栏
  - `src/components/ai/AIActionBar.tsx`
  - 在编辑器底部显示：续写 | 扩写 | 润色 | 压缩 | 改写风格
  - 续写可输入方向/提示

**完成标准**：在编辑器中点击"AI 续写" → 流式看到生成内容 → 显示在 Draft 面板 → 可编辑 → 确认后更新 Scene。

---

## Phase 4: 摘要与向量检索（Day 19-23）

### 任务

- [ ] **P4-1**: 自动摘要生成
  - Canon 确认时调用 AI 生成 summary_short + summary_long
  - 存储到 scene 对应字段
- [ ] **P4-2**: Embedding 生成
  - `src/lib/embeddings/generate.ts`
  - 文本分段 → 调用 OpenAI embedding API → 存入 scene_embeddings
- [ ] **P4-3**: 向量检索
  - `src/lib/embeddings/search.ts`
  - embedding 搜索 → top-K → 返回 chunk + 来源 Scene
- [ ] **P4-4**: 向量检索 API
  - `src/app/api/embeddings/search/route.ts`
- [ ] **P4-5**: 集成到 Context Builder
  - 在 AI 调用上下文中加入 L2 检索结果

**完成标准**：AI 续写时能引用故事中其他 Scene 的语义相关内容。

---

## Phase 5: 故事宇宙管理（Day 24-28）

### 任务

- [ ] **P5-1**: 人物管理
  - `src/lib/services/character.service.ts`
  - `src/app/api/characters/route.ts`
  - `src/components/character/CharacterList.tsx` + `CharacterForm.tsx`
  - `src/app/stories/[id]/characters/page.tsx`
- [ ] **P5-2**: 地点管理
  - 同人物，简单 CRUD
  - `src/app/stories/[id]/locations/page.tsx`
- [ ] **P5-3**: 世界观事实管理
  - 键值对形式，手动添加
  - `src/app/stories/[id]/world/page.tsx`
- [ ] **P5-4**: Scene 与人物关联
  - 编辑 Scene 时可标记出场人物
  - Context Builder 使用关联信息

**完成标准**：可以管理人物/地点/世界观 → AI 续写时自动注入相关信息。

---

## Phase 6: 矛盾检查与收尾（Day 29-33）

### 任务

- [ ] **P6-1**: 矛盾检查 API
  - `src/app/api/ai/check-contradiction/route.ts`
  - 将当前 Scene 内容 + 故事圣经发送给 AI → 标记潜在矛盾
- [ ] **P6-2**: 矛盾检查 UI
  - 检查按钮 → 显示 AI 发现的矛盾列表
  - 每个矛盾标注相关内容和严重程度
- [ ] **P6-3**: 事件时间线
  - events 表 CRUD → 简单列表页
- [ ] **P6-4**: 导入 .txt/.md 文件
  - 文件上传 → 自动创建为 Scene
- [ ] **P6-5**: 导出 Markdown
  - 整个故事按 Scene 顺序导出为 .md 文件
- [ ] **P6-6**: 整体 UI 打磨
  - 空状态设计
  - 加载/流式生成状态
  - 错误状态处理
  - 响应式布局（桌面端优先）

**完成标准**：MVP 全部功能可正常使用，无明显 bug。

---

## Future: Phase 7+ (MVP 之后)

### Phase 7: 故事分支图谱
- 分支创建与管理 UI
- 分支可视化（D3.js / React Flow）
- 跨分支 AI 续写
- 分支合并与对比

### Phase 8: 用户系统
- NextAuth.js 集成
- Supabase RLS 启用
- 用户注册/登录

### Phase 9: 高级 AI
- 伏笔自动检测与追踪
- 人物关系图谱自动构建
- 文风分析与仿写
- 世界观一致性自动检查

### Phase 10: 协作与分享
- 多人协作编辑
- 故事分享/发布
- 评论与反馈

---

## 每日开发建议

1. **先做能跑的，再做能用的，最后做好看的**
2. **每个 Phase 结束后手动测试核心流程**
3. **AI 调用层统一 mock 优先开发 UI，然后再接入真实 API**
4. **数据库迁移不可逆时先备份**
5. **每天 commit 一次，描述清楚做了什么**
