# Story OS — AI 上下文与记忆系统设计

> 版本: 0.1.0-MVP | 日期: 2026-06-26

---

## 1. 问题定义

### 1.1 核心矛盾

AI 模型的上下文窗口有限（DeepSeek-V3: 128K tokens，但实际有效注意力远小于此）。长篇故事动辄 50 万+ 字，远超出任何模型的上下文窗口。即使技术上能塞进去，模型对长文本中间部分的注意力和准确性也会显著下降。

### 1.2 设计目标

1. **不丢失关键信息**：人物设定、世界观规则、关键情节必须被 AI "记住"
2. **语义精准检索**：当 AI 需要"关于魔法系统的设定"时，能精准找到相关内容
3. **上下文预算管理**：每次 AI 调用分配合理的 token 预算，在信息量和准确度之间取得平衡
4. **增量更新**：新增内容自动更新摘要和向量索引，不需要手动维护
5. **Draft 隔离**：AI 只能引用 Canon 内容作为依据，不能用 Draft 内容互相引用

---

## 2. 五层记忆架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     L4: 事件账本 (Event Ledger)                   │
│       结构化时间线，不可变事件记录，支持时序推理                    │
│       存储: events 表 | 检索方式: 按时间范围查询                    │
├─────────────────────────────────────────────────────────────────┤
│                     L3: 故事圣经 (Story Bible)                    │
│       世界观事实、人物、地点、规则的结构化键值存储                   │
│       存储: world_facts + characters + locations 表 | 方式: 关键词查询│
├─────────────────────────────────────────────────────────────────┤
│                     L2: 向量检索 (Semantic Search)                │
│       所有 Canon Scene 内容分段 embedding，语义相似检索             │
│       存储: pgvector | 检索方式: cosine similarity + top-K         │
├─────────────────────────────────────────────────────────────────┤
│                     L1: 摘要层 (Summaries)                        │
│       每节点短摘要 + 长摘要，章节级聚合摘要，递归向上               │
│       存储: scenes.summary_short / scenes.summary_long             │
├─────────────────────────────────────────────────────────────────┤
│                     L0: 原文层 (Raw Text)                         │
│       完整原文存储，当前编辑节点的完整内容直接注入 prompt            │
│       存储: scenes.content                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 各层详解

### 3.1 L0 — 原文层

**职责**：提供当前工作节点的完整原文，以及相邻节点的原文。

**策略**：
- 当前编辑的 Scene 的 `content` **完整**注入 prompt
- 前一个 Scene 和后一个 Scene 的 `content` 各截取前 2000 字注入
- 如果用户选中了某段文字（用于扩写/润色），选中文字完整注入

**Token 预算**：约 40-60% 的 prompt 预算分配给 L0

### 3.2 L1 — 摘要层

**职责**：提供超越当前节点的叙事上下文——前面发生了什么、后面要发生什么。

**核心原则：摘要只是索引，不是真相源。**

> 摘要的作用是帮助 AI **定位**相关 Scene。一旦通过摘要找到目标 Scene，必须从 `scenes.content` 原文中提取实际内容进行推理。绝对不允许用摘要替代原文进行 AI 判断、矛盾检查或上下文生成。原始文本永远不能被摘要替换。

**两种摘要**：

| 类型 | 长度 | 生成方式 | 用途 |
|------|------|---------|------|
| 短摘要 (summary_short) | ≤50 字 | AI 自动生成 | 快速上下文概览、列表展示、Scene 定位 |
| 长摘要 (summary_long) | ≤300 字 | AI 自动生成 | 详细上下文概览、Scene 定位 |

**递归摘要策略**（未来实现）：
- 每个 Scene 有短摘要和长摘要
- 每 N 个 Scene 组成一个 Chapter，Chapter 也有摘要（聚合）
- AI 调用时注入：当前 Scene 摘要 + 同 Chapter 其他 Scene 短摘要 + 其他 Chapter 短摘要
- 越近的节点提供越详细的信息（"近详远略"原则）

**MVP 实现**：
- 用户确认 Draft → Canon 时，自动调用 AI 生成短摘要和长摘要
- 摘要存储在 `scenes` 表的 `short_summary` 和 `long_summary` 字段
- 构建上下文时，注入当前 Scene 前后各 3 个 Scene 的短摘要

**Token 预算**：约 10-15%

### 3.3 L2 — 向量检索层

**职责**：语义级别的"记忆搜索"——当 AI 需要了解某个概念、场景、对话时，通过语义相似度找到最相关的内容。

**工作流程**：

```
1. 内容写入 Canon 时 → 自动分段生成 embedding
2. Scene 内容分段: 按段落分，每段 500-1000 字，重叠 100 字
3. 生成 embedding: text-embedding-3-small (1536d, via DeepSeek API 或 OpenAI)
4. 存储: scene_embeddings 表，每个 chunk 一行
5. 检索: 将当前上下文/用户查询转为 embedding → cosine similarity → top-K
```

**检索策略**：
- 获取当前编辑内容的最后 500 字 → 生成 embedding
- 用该 embedding 搜索 scene_embeddings → 取 top-5 最相似的 chunk
- 将检索到的 chunk 及来源 Scene 信息注入 prompt
- 可选：用户手动输入搜索查询（如"关于血魔法仪式的内容"）

**Token 预算**：约 15-20%

### 3.4 L3 — 故事圣经层

**职责**：结构化的事实存储和检索——人物是谁、魔法系统规则、世界观设定。

**存储形式**：
- `characters` 表：结构化的人物卡
- `locations` 表：地点设定
- `world_facts` 表：键值对的世界观事实

**注入策略**：

```
Step 1: 从当前 Scene 和 L2 检索结果中提取提到的人物名称
Step 2: 查询 characters 表，获取这些人物（可能模糊匹配）
Step 3: 将人物卡信息注入 prompt，格式：
  [人物卡]
  姓名: xxx
  描述: xxx
  性格: xxx
  ...
Step 4: 从 story.world_setting 获取世界观概要
Step 5: 检索最近 5 条 world_facts（或按 category 筛选）
```

**MVP 简化**：
- 人物手动添加，不自动提取
- AI 调用时注入故事中所有主要人物（`is_major = true`）的人物卡
- 如果人物超过 10 个，仅注入 L2 检索结果中提到的人物

**Token 预算**：约 10-15%

### 3.5 L4 — 事件账本层

**职责**：记录"什么时间发生了什么"，支持 AI 进行时间线推理——"A 事件发生在 B 事件之前，所以 A 的后果应该影响 B"。

**存储形式**：`events` 表——不可变的事件记录。

**MVP 实现**：手动添加事件，构建上下文时按 `event_order` 取最近的 10 个事件注入。

**Token 预算**：约 5-10%

---

## 4. 上下文构建流程

### 4.1 续写 (continue) 的上下文构建

```
输入: sceneId (当前编辑的场景)
输出: 拼接好的 prompt 上下文

function buildContinueContext(sceneId: string): ContextParts {
  // L0: 当前 Scene 完整内容
  const currentScene = await getScene(sceneId)
  const rawText = currentScene.content  // 完整注入

  // L0 补充: 前一个 Scene 的结尾部分
  const prevScene = await getPrevScene(currentScene)
  const prevText = prevScene ? truncate(prevScene.content, 2000) : ''

  // L1: 前后各 3 个 Scene 的短摘要
  const adjacentScenes = await getAdjacentScenes(currentScene, { before: 3, after: 3 })
  const summaries = adjacentScenes.map(s => `[${s.title}] ${s.shortSummary}`)

  // L2: 向量检索（用当前内容最后 500 字）
  const queryText = truncateEnd(currentScene.content, 500)
  const similarChunks = await vectorSearch(queryText, { topK: 5 })

  // L3: 故事圣经
  const characters = await getMajorCharacters(currentScene.storyId)
  const worldFacts = await getWorldFacts(currentScene.storyId, { limit: 5 })

  // L4: 事件账本
  const recentEvents = await getRecentEvents(currentScene.storyId, { limit: 10 })

  return { rawText, prevText, summaries, similarChunks, characters, worldFacts, recentEvents }
}
```

### 4.2 Prompt 模板结构

```
[System]
你是一位专业的故事写作助手。你的任务是帮助作者续写故事。
你必须严格遵守以下设定，不得与已有内容产生矛盾。

[故事背景]
{story.title}
{story.description}
{story.worldSetting}

[当前场景 - 完整内容]
{rawText}

[上文结尾]
{prevText}

[相关场景摘要]
{summaries}

[语义相关片段]
{similarChunks}

[人物设定]
{characters}

[世界观规则]
{worldFacts}

[最近事件时间线]
{recentEvents}

[续写要求]
请基于以上所有信息，自然地续写接下来的内容。
要求：
1. 保持与已有设定一致，不得产生矛盾
2. 保持文风一致
3. 续写字数: {targetWordCount} 字左右
4. 如果涉及已有人物，必须保持人物性格和行为逻辑一致
```

### 4.3 Token 预算分配

| 上下文部分 | 层 | 估算 Token | 占比 |
|-----------|-----|-----------|------|
| System Prompt | - | ~200 | 2% |
| 故事背景 | L3 | ~150 | 1.5% |
| 当前 Scene 原文 | L0 | ~4000 | 40% |
| 上文结尾 | L0 | ~1000 | 10% |
| 相邻 Scene 摘要 | L1 | ~800 | 8% |
| 语义相关片段 | L2 | ~1500 | 15% |
| 人物设定 | L3 | ~1000 | 10% |
| 世界观规则 | L3 | ~500 | 5% |
| 事件时间线 | L4 | ~500 | 5% |
| 续写要求 | - | ~200 | 2% |
| **总计** | | **~9850** | — |

目标：单次 AI 调用的 prompt 控制在 8000-12000 tokens，为响应预留 2000-4000 tokens。

---

## 5. 增量更新策略

### 5.1 Draft → Canon 时的自动操作

```
onCanonize(sceneId, draftContent):
  1. 更新 scene.content = draftContent
  2. 更新 scene.word_count
  3. 调用 AI 生成 summary_short → 存入 scene.summary_short
  4. 调用 AI 生成 summary_long → 存入 scene.summary_long
  5. 调用 AI 提取本 Scene 新增的事实 → 存入 scene.facts_added (JSONB)
     ⚠️ 注意：AI 提取的事实仅为"建议"，以 JSONB 形式存储在 Scene 中供参考
     如果用户手动确认某条事实 → 才写入 world_facts / characters / events 等正式表
  6. 调用 AI 检测本 Scene 的未闭合叙事线 → 存入 scene.open_threads (JSONB)
  7. 对 scene.content 分段 → 生成 embeddings → 存入 scene_embeddings
     (先删除该 scene 的旧 embeddings，再写入新的)
  8. (可选) 提示用户：是否审查新提取的事实和未闭合叙事线？
```

### 5.2 Embedding 分段策略

```typescript
function splitForEmbedding(text: string): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > 800) {
      chunks.push(currentChunk.trim())
      currentChunk = para
    } else {
      currentChunk += '\n\n' + para
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim())

  return chunks
}
```

---

## 6. AI 调用配置

### 6.1 模型选择

| 任务 | 模型 | 理由 |
|------|------|------|
| 续写 (continue) | deepseek-v4-flash | 旗舰快速模型，大部分续写场景够用 |
| 扩写 (expand) | deepseek-v4-flash | 同上 |
| 润色 (polish) | deepseek-v4-flash | 简单任务 |
| 压缩 (compress) | deepseek-v4-flash | 简单任务 |
| 改写风格 (rewrite) | deepseek-reasoner | 复杂风格转换需要更强推理 |
| 矛盾检查 (check) | deepseek-reasoner | 需要仔细对比，容易漏判 |
| 生成摘要 | deepseek-v4-flash | 总结类任务通用模型足够 |
| 生成 embedding | text-embedding-3-small | 1536d，便宜准确（via DeepSeek API 或 OpenAI） |

### 6.2 API 参数

```typescript
const defaultParams = {
  model: "deepseek-v4-flash",
  temperature: 0.8,       // 创作类任务适度提高
  max_tokens: 4096,
  top_p: 0.95,
  frequency_penalty: 0.3,  // 轻微抑制重复
  presence_penalty: 0.3,
}
```

### 6.3 流式输出

所有 AI 续写/扩写类接口使用 SSE (Server-Sent Events) 实现流式输出：

```
POST /api/ai/continue
→ Response: text/event-stream
  data: {"type": "token", "content": "她"}
  data: {"type": "token", "content": "推开"}
  data: {"type": "token", "content": "了"}
  ...
  data: {"type": "done", "draftId": "xxx"}
```

---

## 7. MVP 简化决策

| 功能 | MVP 做 | 未来做 |
|------|--------|--------|
| Scene 自动摘要 | ✅ Canon 时自动生成 | 递归向上聚合 |
| 向量检索 | ✅ 简单 top-5 | 混合检索 + rerank |
| 人物自动提取 | ❌ 手动添加 | AI 自动提取新人物 |
| 伏笔自动检测 | ❌ 手动添加 | AI 检测和追踪 |
| 事件自动提取 | ❌ 手动添加 | AI 自动提取事件 |
| 矛盾自动检查 | ✅ 手动触发 | 每次保存时自动检查 |
| 文风保持 | ✅ prompt 指令 | fine-tune / style embedding |
