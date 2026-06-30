// ============================================================
// Story OS — DeepSeek API client
// Uses OpenAI SDK (DeepSeek API is OpenAI-compatible).
// API key from DEEPSEEK_API_KEY env var — never leaked to client.
// ============================================================

import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

// ---- Available models ----
export const DEEPSEEK_MODELS = {
  "deepseek-v4-flash": {
    label: "DeepSeek-V4 Flash",
    desc: "旗舰快速模型，速度快，适合创作和续写",
  },
  "deepseek-reasoner": {
    label: "DeepSeek-R1 (Reasoner)",
    desc: "推理增强，适合复杂情节设计和矛盾检查",
  },
} as const;

export type DeepSeekModel = keyof typeof DEEPSEEK_MODELS;

/** Default model: env var DEEPSEEK_MODEL, or deepseek-v4-flash */
export function getDefaultModel(): DeepSeekModel {
  const envModel = process.env.DEEPSEEK_MODEL;
  if (envModel && envModel in DEEPSEEK_MODELS) {
    return envModel as DeepSeekModel;
  }
  return "deepseek-v4-flash";
}

// ---- Client ----
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY environment variable is not set. " +
      "Add it to your .env.local file."
    );
  }

  _client = new OpenAI({
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
  });

  return _client;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  /** Set to true to request JSON output */
  jsonMode?: boolean;
}

const DEFAULTS: Omit<Required<ChatOptions>, "model" | "jsonMode"> = {
  temperature: 0.8,
  maxTokens: 4096,
  topP: 0.95,
  frequencyPenalty: 0.3,
  presencePenalty: 0.3,
};

export interface ChatResult {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Send a chat completion request to DeepSeek.
 * Non-streaming — returns the full response.
 */
export async function chat(
  systemPrompt: string,
  userMessage: string,
  options?: ChatOptions
): Promise<ChatResult> {
  const client = getClient();
  const model = options?.model ?? getDefaultModel();
  const jsonMode = options?.jsonMode ?? false;
  const opts = { ...DEFAULTS, ...options, model };

  const response = await client.chat.completions.create({
    model: opts.model,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    top_p: opts.topP,
    frequency_penalty: opts.frequencyPenalty,
    presence_penalty: opts.presencePenalty,
    ...(jsonMode ? { response_format: { type: "json_object" } as const } : {}),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new Error("DeepSeek returned an empty response");
  }

  return {
    content: choice.message.content,
    model: response.model,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
  };
}

/** Check if the DeepSeek API key is configured */
export function hasDeepSeek(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}
