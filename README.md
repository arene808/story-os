<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle" alt="Drizzle">
  <img src="https://img.shields.io/badge/DeepSeek-V4-536DFE?logo=openai" alt="DeepSeek">
  <img src="https://img.shields.io/badge/tests-39/39_✅-green?logo=vitest" alt="Tests">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

<h1 align="center">Story OS</h1>
<p align="center"><strong>AI 驱动的长篇小说创作引擎</strong></p>
<p align="center">长期记忆 · 分支管理 · 一致性检查 · Draft/Canon 流程</p>

---

## 解决的问题

AI 写短文案很擅长，但写长篇小说是另一回事。当故事超过 5 万字，AI 开始遗忘人物设定、混淆情节线索、前后矛盾。

**Story OS 用五层记忆架构解决这个问题**：不是把整个故事塞进 prompt，而是教会 AI「查字典」——在需要的时候精准找到相关信息。

```
┌─────────────────────────────────────────────────┐
│             五层记忆架构                          │
├─────────────────────────────────────────────────┤
│  L4  事件账本    不可变时间线，支持时序推理        │
│  L3  故事圣经    人物卡 + 世界观 + 地点            │
│  L2  向量检索    语义搜索，跨章节召回              │
│  L1  摘要层      每节点摘要，快速定位               │
│  L0  原文层      完整原文，唯一真相源               │
└─────────────────────────────────────────────────┘
```

## 核心功能

<table>
<tr>
  <td width="50%">

### ✨ AI 智能续写
- 基于完整上下文的智能续写
- 支持 `@` 引用已有章节作为参考
- 可选文段引用，精确控制 AI 方向
- 多模型支持（DeepSeek-V4 / R1）

  </td>
  <td width="50%">

### 🔍 AI 结构化抽取
- 自动提取人物、地点、事件
- 世界观事实与叙事线索识别
- 人工审核后保存到故事宇宙
- 可编辑、可追溯来源场景

  </td>
</tr>
<tr>
  <td>

### 📝 Draft / Canon 铁律
- AI 输出先进草稿表，不直接覆盖原文
- 用户审核 → 编辑 → 确认，全程可控
- 草稿可对比原文，逐字确认
- 作者始终是最终决策者

  </td>
  <td>

### 🌿 故事分支系统
- 有向图而非线性文档
- 主线 + IF 线 + 支线自由创建
- 树形可视化，分支关系一目了然
- 每条分支独立发展，互不干扰

  </td>
</tr>
<tr>
  <td>

### 👤 故事宇宙管理
- 结构化人物卡（外貌、性格、背景、动机）
- 事件时间线（不可变账本）
- 世界观设定 + 地点树形结构
- 场景与人物多对多关联

  </td>
  <td>

### 📋 完整故事管理
- 创建 / 编辑 / 复制 / 归档 / 删除
- 批量操作（全选、批量删除、批量归档）
- 搜索 + 排序 + 状态筛选
- 一键导出 Markdown

  </td>
</tr>
</table>

## 快速开始

```bash
# 1. 克隆仓库
git clone git@github.com:arene808/story-os.git
cd story-os

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入你的 DEEPSEEK_API_KEY

# 4. 启动数据库（双击或终端）
scripts\db-start.bat

# 5. 启动开发服务器
npm run dev

# 6. 打开浏览器
open http://localhost:3000
```

> 💡 **无需数据库也能跑**：不配置 `DATABASE_URL` 时，应用自动使用本地 JSON 文件持久化存储。配置 PostgreSQL 后自动切换。

## 技术架构

```
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Next.js 16  │───▶│  Service     │───▶│  PostgreSQL 17   │
│  App Router  │    │  Layer       │    │  + Drizzle ORM   │
└──────┬───────┘    └──────┬───────┘    └──────────────────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  React 19    │    │  DeepSeek    │
│  Tailwind 4  │    │  API Client  │
└──────────────┘    └──────────────┘
```

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Next.js 16 (App Router) | RSC + 文件系统路由 |
| 语言 | TypeScript (strict) | 零 `any`，全量类型覆盖 |
| 样式 | Tailwind CSS 4 | 快速原型，设计一致性 |
| 数据库 | PostgreSQL 17 + Drizzle ORM | 12 张表，完整外键约束 |
| AI | DeepSeek API (OpenAI 兼容) | V4 Flash / R1 Reasoner |
| 测试 | Vitest | 39 个测试，覆盖全部 Service 层 |
| 部署 | Vercel / Docker | 一键部署 |

## 项目结构

```
story-os/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # 首页
│   │   ├── stories/          # 故事列表 + 详情
│   │   ├── scenes/[id]/      # Scene 编辑器（核心）
│   │   └── api/              # REST + AI 接口 (15 routes)
│   ├── components/
│   │   ├── ai/               # AI 面板（续写/抽取/审核）
│   │   ├── editor/           # 编辑器（自动保存/状态/工具栏）
│   │   ├── story/            # 故事管理（卡片/菜单/编辑/删除）
│   │   ├── scene/            # 场景组件
│   │   └── ui/               # 通用组件（Button/Card/Modal/Input）
│   ├── lib/
│   │   ├── ai/               # DeepSeek 客户端 + Prompt 模板 + Context Builder
│   │   ├── db/               # Drizzle Schema (12 tables) + 连接管理
│   │   ├── services/         # 业务逻辑层（6 services）
│   │   ├── store/            # 文件持久化（离线模式）
│   │   └── mock-data.ts      # 演示数据（2 个完整故事）
│   └── types/                # TypeScript 类型（12 实体）
├── docs/                     # 设计文档（5 篇）
├── scripts/                  # 数据库启动/迁移脚本
├── tests/                    # 测试（4 文件 / 39 用例）
└── supabase/migrations/      # 数据库迁移 SQL
```

## 文档

| 文档 | 内容 |
|------|------|
| [PRD](docs/PRD.md) | 产品需求：5 类用户、22 个功能 |
| [架构设计](docs/ARCHITECTURE.md) | 技术选型、路由设计、数据流 |
| [数据模型](docs/DATA_MODEL.md) | 12 张表的完整 SQL + ERD |
| [AI 记忆系统](docs/AI_MEMORY.md) | 五层架构、Token 预算、Prompt 设计 |
| [路线图](docs/ROADMAP.md) | 6 阶段 MVP 计划 |
| [开发规范](AGENTS.md) | 命名、文件、AI、测试、Git 规则 |

## 命令参考

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm test             # 运行 39 个测试
npm run lint         # ESLint 检查
npx drizzle-kit push # 数据库迁移（PostgreSQL 模式）
```

## License

MIT © 2026 [arene808](https://github.com/arene808)
