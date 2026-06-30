# Story OS

> AI 辅助长篇小说创作平台 — 长期故事记忆 · 分支管理 · 一致性检查

Story OS 是一个专为长篇小说作者设计的创作工具。它通过五层记忆架构（原文 → 摘要 → 向量检索 → 故事圣经 → 事件账本）跨越 AI 上下文窗口的限制，帮助作者在数万乃至数十万字的作品中保持人物、设定和情节的一致性。

## 核心特性

- **多层故事记忆** — L0 原文 + L1 摘要 + L2 向量检索 + L3 故事圣经 + L4 事件账本
- **分支管理** — 故事是有向图而非线性文档，支持主线、IF 线、支线
- **Draft/Canon 铁律** — 所有 AI 输出先进入草稿状态，用户确认后才成为正史
- **AI 续写** — 基于完整上下文的智能续写，保持人物性格和世界观一致
- **结构化提取** — 自动从文本中提取人物、地点、事件、世界观事实

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript (strict) |
| 样式 | Tailwind CSS 4 |
| 数据库 | Supabase (PostgreSQL + pgvector) |
| ORM | Drizzle ORM |
| AI | DeepSeek API (deepseek-v4-flash / deepseek-reasoner) |
| 测试 | Vitest |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 DEEPSEEK_API_KEY 和 DATABASE_URL

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问 http://localhost:3000
```

> **无需数据库即可体验**：如果不配置 `DATABASE_URL`，应用会自动使用内存存储并加载演示数据（故事「烬海纪元」）。

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 首页
│   ├── stories/            # 故事列表 + 详情
│   ├── scenes/[id]/        # Scene 编辑器
│   └── api/                # REST API + AI 接口
├── components/
│   ├── ai/                 # AI 面板（DraftReviewPanel）
│   ├── editor/             # 编辑器组件（SceneEditor, StatusSelector, EditorToolbar）
│   ├── story/              # 故事组件
│   ├── scene/              # Scene 组件
│   └── ui/                 # 通用 UI 组件
├── lib/
│   ├── ai/                 # DeepSeek 客户端, Prompt 模板, Context Builder
│   ├── db/                 # Drizzle schema + 连接
│   ├── services/           # 业务逻辑层
│   └── mock-data.ts        # 演示数据
├── types/                  # TypeScript 类型定义
└── docs/                   # 设计文档
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── DATA_MODEL.md
    ├── AI_MEMORY.md
    └── ROADMAP.md
```

## 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch
```

## 文档

- [产品需求文档](docs/PRD.md)
- [技术架构](docs/ARCHITECTURE.md)
- [数据模型](docs/DATA_MODEL.md)
- [AI 记忆系统](docs/AI_MEMORY.md)
- [MVP 路线图](docs/ROADMAP.md)
- [开发规范](AGENTS.md)

## License

Private — 个人项目
