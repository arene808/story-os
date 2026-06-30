// ============================================================
// Story OS — AI Prompt Templates
// All prompts are centralized here. Never hardcode prompts
// in components or API routes.
// ============================================================

export interface ReferencePassage {
  sceneTitle: string;
  text: string;
}

export interface ContinuePromptInput {
  storyTitle: string;
  storyDescription: string;
  worldSetting: string;
  currentSceneTitle: string;
  currentSceneContent: string;
  previousScenesSummary: string; // summaries of recent canon scenes
  targetWordCount: number;
  styleHint?: string;
  direction?: string; // user's direction/instruction for the continuation
  referencePassages?: ReferencePassage[]; // user-selected passages from other scenes
}

/**
 * Build the system + user prompts for AI scene continuation.
 * Returns { systemPrompt, userMessage } for the chat completion call.
 */
export function buildContinuePrompt(input: ContinuePromptInput): {
  systemPrompt: string;
  userMessage: string;
} {
  const systemPrompt = `你是一位专业的故事写作助手，帮助作者续写长篇小说。

你的任务是根据已有的故事设定、前文内容和当前场景，自然地续写接下来的内容。

写作要求：
1. **严格保持一致性**：人物性格、世界观规则、叙事风格必须与已有内容完全一致，不得产生矛盾。
2. **保持文风**：延续原文的叙事语气、节奏和用词风格。
3. **自然衔接**：续写内容应从当前场景的结尾处自然延伸，不突兀。
4. **推动情节**：续写不只是描写，应推进故事发展。
5. **字数控制**：续写 ${input.targetWordCount} 字左右。
6. **不重复已有内容**：不要复述已经发生的情节。
7. **如果涉及已有人物**：保持其性格特征和行为逻辑的一致性。
8. **不要完结整个故事**：除非当前场景是故事终点，否则留下继续发展的空间。`;

  let userMessage = "";

  // Story background
  userMessage += `【故事背景】\n`;
  userMessage += `标题：${input.storyTitle}\n`;
  if (input.storyDescription) {
    userMessage += `简介：${input.storyDescription}\n`;
  }
  if (input.worldSetting) {
    userMessage += `世界观：${input.worldSetting}\n`;
  }
  userMessage += `\n`;

  // Previous scenes context
  if (input.previousScenesSummary) {
    userMessage += `【前文摘要】\n${input.previousScenesSummary}\n\n`;
  }

  // Current scene (raw_text — the source of truth)
  userMessage += `【当前场景 - 完整原文】\n`;
  userMessage += `标题：${input.currentSceneTitle}\n`;
  userMessage += `正文：\n${input.currentSceneContent}\n\n`;

  // User-provided reference passages
  if (input.referencePassages && input.referencePassages.length > 0) {
    userMessage += `【作者指定的参考文段】\n`;
    userMessage += `以下文段由作者从已有章节中选取，供你参考风格、设定和情节走向：\n\n`;
    for (const ref of input.referencePassages) {
      userMessage += `--- 来自「${ref.sceneTitle}」---\n`;
      userMessage += `${ref.text}\n\n`;
    }
  }

  // Writing instruction
  userMessage += `【续写要求】\n`;
  if (input.direction) {
    userMessage += `作者续写方向：${input.direction}\n`;
  }
  userMessage += `请基于以上所有信息，从当前场景的结尾处自然地续写接下来的内容。`;
  userMessage += `续写 ${input.targetWordCount} 字左右。`;
  if (input.styleHint) {
    userMessage += `\n风格提示：${input.styleHint}`;
  }
  if (input.referencePassages && input.referencePassages.length > 0) {
    userMessage += `\n请特别参考【作者指定的参考文段】中的风格和设定。`;
  }

  return { systemPrompt, userMessage };
}

// ============================================================
// AI Structured Extraction
// ============================================================

export interface ExtractPromptInput {
  sceneTitle: string;
  sceneContent: string;
  storyTitle: string;
  worldSetting: string;
  existingCharacters: string;
  existingLocations: string;
}

export interface ExtractedCharacter {
  name: string;
  description: string;
  isNew: boolean;
}

export interface ExtractedLocation {
  name: string;
  description: string;
  isNew: boolean;
}

export interface ExtractedEvent {
  title: string;
  description: string;
  eventTime: string;
}

export interface ExtractedFact {
  key: string;
  value: string;
  category: string;
}

export interface ExtractedThread {
  description: string;
  status: "open" | "hinted";
}

export interface ExtractionResult {
  summaryShort: string;
  summaryLong: string;
  characters: ExtractedCharacter[];
  locations: ExtractedLocation[];
  events: ExtractedEvent[];
  factsAdded: ExtractedFact[];
  openThreads: ExtractedThread[];
}

const EXTRACTION_JSON_SCHEMA = `{
  "summary_short": "一句话摘要，不超过50字",
  "summary_long": "详细摘要，不超过300字",
  "characters": [
    {"name": "人物姓名", "description": "一句话描述", "isNew": true}
  ],
  "locations": [
    {"name": "地点名称", "description": "一句话描述", "isNew": true}
  ],
  "events": [
    {"title": "事件名称", "description": "事件描述", "eventTime": "故事内时间或留空"}
  ],
  "facts_added": [
    {"key": "事实名称", "value": "事实内容", "category": "world|character|plot|organization|history|magic|tech|society|rules"}
  ],
  "open_threads": [
    {"description": "未闭合的叙事线索", "status": "open"}
  ]
}`;

export function buildExtractPrompt(input: ExtractPromptInput): {
  systemPrompt: string;
  userMessage: string;
} {
  const systemPrompt = `你是一位专业的故事分析助手。你的任务是从给定的故事场景中提取结构化信息。

你必须严格按照要求的 JSON 格式输出。不要添加任何额外的解释文字，只输出 JSON。

提取规则：
1. **摘要**：summary_short ≤50字，summary_long ≤300字。
2. **人物**：列出场景中所有人物。与已知人物匹配则 isNew=false，新人物 isNew=true。
3. **地点**：列出场景中所有地点，同样标记 isNew。
4. **事件**：列出场景中的关键事件。eventTime 填写故事内时间，不确定则留空。
5. **世界观事实 (facts_added)**：本场景首次揭示的世界观信息。category：world/character/plot/organization/history/magic/tech/society/rules。
6. **未闭合叙事线 (open_threads)**：本场景提出的未解决线索。status："open" 或 "hinted"。
7. 某类别无内容则返回空数组 []。`;

  let userMessage = `【故事信息】
标题：${input.storyTitle}
世界观：${input.worldSetting || "未设定"}

【已知人物】
${input.existingCharacters || "暂无"}

【已知地点】
${input.existingLocations || "暂无"}

【当前场景】
标题：${input.sceneTitle}
正文：
${input.sceneContent}

请按以下 JSON schema 输出提取结果：\n${EXTRACTION_JSON_SCHEMA}`;

  return { systemPrompt, userMessage };
}

/**
 * Parse and validate the AI's JSON response.
 * Strips markdown fences, sanitizes all fields, returns clean ExtractionResult.
 */
export function parseExtractionResponse(raw: string): ExtractionResult {
  let json = raw.trim();
  if (json.startsWith("```")) {
    json = json.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("AI 返回了无效的 JSON，请重试。");
  }

  const obj = parsed as Record<string, unknown>;

  return {
    summaryShort: String(obj.summary_short ?? "").slice(0, 100),
    summaryLong: String(obj.summary_long ?? "").slice(0, 500),
    characters: ensureArray(obj.characters).map(fixCharacter),
    locations: ensureArray(obj.locations).map(fixLocation),
    events: ensureArray(obj.events).map(fixEvent),
    factsAdded: ensureArray(obj.facts_added ?? obj.factsAdded).map(fixFact),
    openThreads: ensureArray(obj.open_threads ?? obj.openThreads).map(fixThread),
  };
}

function ensureArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v : [];
}

function fixCharacter(c: Record<string, unknown>): ExtractedCharacter {
  return { name: String(c.name ?? "").slice(0, 50), description: String(c.description ?? "").slice(0, 200), isNew: Boolean(c.isNew ?? c.is_new ?? true) };
}

function fixLocation(l: Record<string, unknown>): ExtractedLocation {
  return { name: String(l.name ?? "").slice(0, 50), description: String(l.description ?? "").slice(0, 200), isNew: Boolean(l.isNew ?? l.is_new ?? true) };
}

function fixEvent(e: Record<string, unknown>): ExtractedEvent {
  return { title: String(e.title ?? "").slice(0, 100), description: String(e.description ?? "").slice(0, 300), eventTime: String(e.eventTime ?? e.event_time ?? "").slice(0, 100) };
}

function fixFact(f: Record<string, unknown>): ExtractedFact {
  const valid = ["world","character","plot","organization","history","magic","tech","society","rules"];
  const cat = String(f.category ?? "").toLowerCase();
  return { key: String(f.key ?? "").slice(0, 100), value: String(f.value ?? "").slice(0, 500), category: valid.includes(cat) ? cat : "world" };
}

function fixThread(t: Record<string, unknown>): ExtractedThread {
  const s = String(t.status ?? "open").toLowerCase();
  return { description: String(t.description ?? "").slice(0, 300), status: s === "hinted" ? "hinted" : "open" };
}
