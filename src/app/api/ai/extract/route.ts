// ============================================================
// Story OS — POST /api/ai/extract
//
// Takes a scene ID, builds context, calls DeepSeek with JSON
// mode, parses the structured output, and returns it as
// "pending_review" for the user to confirm or edit.
// ============================================================

import { NextResponse } from "next/server";
import { chat, DEEPSEEK_MODELS } from "@/lib/ai/deepseek";
import type { DeepSeekModel } from "@/lib/ai/deepseek";
import { buildExtractPrompt, parseExtractionResponse } from "@/lib/ai/prompts";
import { getScene, listScenesByStory } from "@/lib/services/scene.service";
import { getStory } from "@/lib/services/story.service";
import { getCharactersByStory } from "@/lib/mock-data";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sceneId, model: requestedModel } = body;

    if (!sceneId || typeof sceneId !== "string") {
      return NextResponse.json({ error: "sceneId is required" }, { status: 400 });
    }

    // Validate model
    let model: DeepSeekModel | undefined;
    if (requestedModel) {
      if (requestedModel in DEEPSEEK_MODELS) {
        model = requestedModel as DeepSeekModel;
      } else {
        return NextResponse.json({ error: `不支持的模型: ${requestedModel}` }, { status: 400 });
      }
    }

    // ---- Load context ----
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    if (!scene.content.trim()) {
      return NextResponse.json({ error: "场景内容为空，无法提取" }, { status: 400 });
    }

    const story = await getStory(scene.storyId);
    const allScenes = await listScenesByStory(scene.storyId);
    const characters = getCharactersByStory(scene.storyId);

    // Format existing data for the prompt
    const existingChars = characters
      .map((c) => `${c.name}：${c.description}`)
      .join("\n");

    // Collect known locations from other canon scenes' facts_added
    const knownLocations = allScenes
      .filter((s) => s.status === "canon" && s.id !== scene.id)
      .flatMap((s) => s.factsAdded)
      .filter((f) => f.category === "world")
      .map((f) => `${f.key}：${f.value}`)
      .slice(0, 20)
      .join("\n");

    // ---- Build prompt ----
    const { systemPrompt, userMessage } = buildExtractPrompt({
      sceneTitle: scene.title,
      sceneContent: scene.content,
      storyTitle: story?.title ?? "",
      worldSetting: story?.worldSetting ?? "",
      existingCharacters: existingChars,
      existingLocations: knownLocations,
    });

    // ---- Call DeepSeek with JSON mode ----
    let aiResponse;
    try {
      aiResponse = await chat(systemPrompt, userMessage, {
        model,
        temperature: 0.3, // low temperature for structured extraction
        maxTokens: 4096,
        jsonMode: true,
      });
    } catch (e) {
      const msg = (e as Error).message;
      return NextResponse.json(
        {
          error: "AI 调用失败",
          detail: msg.includes("API key") ? "API key 无效或未配置" : msg,
        },
        { status: 502 }
      );
    }

    // ---- Parse & validate JSON ----
    let extraction;
    try {
      extraction = parseExtractionResponse(aiResponse.content);
    } catch (e) {
      return NextResponse.json(
        {
          error: "AI 返回内容解析失败",
          detail: (e as Error).message,
          rawResponse: aiResponse.content.slice(0, 500),
        },
        { status: 422 }
      );
    }

    // ---- Return as pending_review ----
    return NextResponse.json(
      {
        status: "pending_review",
        extraction,
        usage: aiResponse.usage,
        model: aiResponse.model,
      },
      { status: 200 }
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[ai/extract] Error:", msg);
    return NextResponse.json(
      { error: "服务器错误", detail: msg },
      { status: 500 }
    );
  }
}
