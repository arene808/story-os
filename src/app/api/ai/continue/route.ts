// ============================================================
// Story OS — POST /api/ai/continue
//
// Takes the current scene ID, builds context from canonical
// scenes, calls DeepSeek, and saves the result as a DRAFT
// (in the drafts table, linked to the current scene).
//
// The user MUST review and approve the draft before it
// becomes canon — per AGENTS.md §2.2 Draft/Canon iron law.
// ============================================================

import { NextResponse } from "next/server";
import { chat, DEEPSEEK_MODELS, getDefaultModel } from "@/lib/ai/deepseek";
import type { DeepSeekModel } from "@/lib/ai/deepseek";
import { buildContinuePrompt, type ReferencePassage } from "@/lib/ai/prompts";
import { buildContinueContext, formatScenesSummary } from "@/lib/ai/context-builder";
import { createDraft } from "@/lib/services/draft.service";
import { getScene } from "@/lib/services/scene.service";

/** GET /api/ai/continue — list available models + default */
export async function GET() {
  return NextResponse.json({
    models: DEEPSEEK_MODELS,
    defaultModel: getDefaultModel(),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sceneId,
      targetWordCount = 500,
      styleHint,
      direction,
      references,
      model: requestedModel,
    } = body;

    // references type: { sceneId: string; sceneTitle: string; passage: string | null }[]

    // Validate model if specified
    let model: DeepSeekModel | undefined;
    if (requestedModel) {
      if (requestedModel in DEEPSEEK_MODELS) {
        model = requestedModel as DeepSeekModel;
      } else {
        return NextResponse.json(
          { error: `不支持的模型: ${requestedModel}。可用: ${Object.keys(DEEPSEEK_MODELS).join(", ")}` },
          { status: 400 }
        );
      }
    }

    if (!sceneId || typeof sceneId !== "string") {
      return NextResponse.json(
        { error: "sceneId is required" },
        { status: 400 }
      );
    }

    // ---- Step 1: Build context ----
    const context = await buildContinueContext(sceneId, {
      maxPreviousScenes: 5,
      maxNextScenes: 1,
    });

    // ---- Step 2: Format summaries ----
    const previousScenesSummary = formatScenesSummary(context.previousCanonScenes);

    // ---- Step 2.5: Resolve reference passages ----
    const referencePassages: ReferencePassage[] = [];
    if (references && Array.isArray(references)) {
      for (const ref of references) {
        if (ref.sceneId && ref.sceneTitle) {
          // If user selected a specific passage, use it; otherwise fetch full scene
          if (ref.passage) {
            referencePassages.push({ sceneTitle: ref.sceneTitle, text: ref.passage });
          } else {
            const refScene = await getScene(ref.sceneId);
            if (refScene && refScene.content) {
              // Take first 2000 chars as reference
              const text = refScene.content.length > 2000
                ? refScene.content.slice(0, 2000) + "\n…（后续内容已截断）"
                : refScene.content;
              referencePassages.push({ sceneTitle: refScene.title, text });
            }
          }
        }
      }
    }

    // ---- Step 3: Build prompt ----
    const { systemPrompt, userMessage } = buildContinuePrompt({
      storyTitle: context.story.title,
      storyDescription: context.story.description,
      worldSetting: context.story.worldSetting,
      currentSceneTitle: context.currentScene.title,
      currentSceneContent: context.currentScene.content,
      previousScenesSummary,
      targetWordCount,
      styleHint,
      direction,
      referencePassages: referencePassages.length > 0 ? referencePassages : undefined,
    });

    // ---- Step 4: Call DeepSeek ----
    let aiResponse;
    try {
      aiResponse = await chat(systemPrompt, userMessage, {
        model,
        temperature: 0.8,
        maxTokens: Math.min(targetWordCount * 3, 4096),
      });
    } catch (e) {
      const msg = (e as Error).message;
      return NextResponse.json(
        {
          error: "AI 调用失败，请检查 DEEPSEEK_API_KEY 是否有效。",
          detail: msg.includes("API key") ? "API key 无效或未配置" : msg,
        },
        { status: 502 }
      );
    }

    // ---- Step 5: Save as DRAFT (NOT as a new scene) ----
    // Per AGENTS.md §2.2: AI output → drafts table → user review → canon
    const draft = await createDraft({
      sceneId: context.currentScene.id,
      content: aiResponse.content,
      aiAction: "continue",
      aiModel: model ?? getDefaultModel(),
      aiPrompt: `${systemPrompt}\n\n---\n\n${userMessage}`,
    });

    // ---- Return result ----
    return NextResponse.json(
      {
        draft: {
          id: draft.id,
          sceneId: draft.sceneId,
          content: draft.content,
          wordCount: draft.wordCount,
          status: draft.status,
        },
        usage: aiResponse.usage,
        model: aiResponse.model,
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[ai/continue] Error:", msg);
    return NextResponse.json(
      { error: "服务器错误", detail: msg },
      { status: 500 }
    );
  }
}
