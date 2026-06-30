// ============================================================
// Story OS — Context Builder Tests
// Verifies L0 (raw text) and L1 (summaries) assembly
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { buildContinueContext, formatScenesSummary } from "@/lib/ai/context-builder";
import { createStory } from "@/lib/services/story.service";
import { createScene, updateScene } from "@/lib/services/scene.service";
import type { Scene } from "@/types";

beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g["__story_os_story_store__"];
  delete g["__story_os_scene_store__"];
  const d = path.join(process.cwd(), "data");
  try { fs.unlinkSync(path.join(d, "stories.json")); } catch {}
  try { fs.unlinkSync(path.join(d, "scenes.json")); } catch {}
});

describe("context-builder", () => {
  describe("buildContinueContext", () => {
    it("should throw if scene does not exist", async () => {
      await expect(buildContinueContext("no-such-scene")).rejects.toThrow(
        "Scene not found"
      );
    });

    it("should throw if story does not exist", async () => {
      // Create a scene whose storyId points to nothing
      const g = globalThis as Record<string, unknown>;
      const storeKey = "__story_os_scene_store__";
      if (!g[storeKey]) g[storeKey] = new Map();

      const store = g[storeKey] as Map<string, Scene>;
      const sceneId = "orphan-scene";
      store.set(sceneId, {
        id: sceneId,
        storyId: "no-such-story",
        branchId: null,
        parentSceneId: null,
        title: "孤儿场景",
        content: "没有所属故事的场景",
        summaryShort: "",
        summaryLong: "",
        sortOrder: 0,
        status: "draft",
        wordCount: 5,
        factsAdded: [],
        openThreads: [],
        meta: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await expect(buildContinueContext(sceneId)).rejects.toThrow(
        "Story not found"
      );
    });

    it("should build context with story and scene metadata", async () => {
      const story = await createStory({
        title: "测试故事",
        description: "故事描述",
        worldSetting: "奇幻世界",
      });

      const scene = await createScene({
        storyId: story.id,
        title: "第一章",
        content: "这是一段测试内容。",
      });

      const context = await buildContinueContext(scene.id);

      expect(context.story.id).toBe(story.id);
      expect(context.story.title).toBe("测试故事");
      expect(context.currentScene.id).toBe(scene.id);
      expect(context.currentScene.content).toBe("这是一段测试内容。");
    });

    it("should include previous canon scenes sorted by sortOrder", async () => {
      const story = await createStory({ title: "多场景故事" });

      // Create 5 canon scenes
      const scenes: Scene[] = [];
      for (let i = 0; i < 5; i++) {
        const s = await createScene({
          storyId: story.id,
          title: `场景${i + 1}`,
          content: `场景${i + 1}的内容`,
        });
        await updateScene(s.id, { status: "canon" });
        const updated = { ...s, status: "canon" as const, sortOrder: i };
        scenes.push(updated as Scene);
      }

      // Build context from the 5th scene (index 4)
      const context = await buildContinueContext(scenes[4].id, {
        maxPreviousScenes: 5,
      });

      expect(context.previousCanonScenes.length).toBe(4); // should have 4 previous
      expect(context.allCanonScenes.length).toBe(5);
      expect(context.nextCanonScenes.length).toBe(0); // last scene has no next
    });

    it("should exclude draft scenes from previous/next", async () => {
      const story = await createStory({ title: "草稿测试" });

      const s1 = await createScene({ storyId: story.id, title: "正史1" });
      await updateScene(s1.id, { status: "canon" });

      const s2 = await createScene({ storyId: story.id, title: "草稿" });
      // stays draft

      const s3 = await createScene({ storyId: story.id, title: "正史2" });
      await updateScene(s3.id, { status: "canon" });

      // Build context from s3
      const context = await buildContinueContext(s3.id, {
        maxPreviousScenes: 5,
      });

      // s2 (draft) should be excluded from previous canon scenes
      const prevTitles = context.previousCanonScenes.map((s) => s.title);
      expect(prevTitles).toContain("正史1");
      expect(prevTitles).not.toContain("草稿");
    });
  });

  describe("formatScenesSummary", () => {
    it("should return empty string for empty array", () => {
      expect(formatScenesSummary([])).toBe("");
    });

    it("should format scene summaries for prompt injection", () => {
      const scenes: Scene[] = [
        {
          id: "s1",
          storyId: "story-1",
          branchId: null,
          parentSceneId: null,
          title: "第一章",
          content: "完整内容很长很长...",
          summaryShort: "卡娅发现石板",
          summaryLong: "卡娅在废墟中发现了古代石板。",
          sortOrder: 0,
          status: "canon",
          wordCount: 100,
          factsAdded: [],
          openThreads: [],
          meta: {},
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "s2",
          storyId: "story-1",
          branchId: null,
          parentSceneId: null,
          title: "第二章",
          content: "另一个场景的完整内容...",
          summaryShort: "",
          summaryLong: "",
          sortOrder: 1,
          status: "canon",
          wordCount: 50,
          factsAdded: [],
          openThreads: [],
          meta: {},
          createdAt: "",
          updatedAt: "",
        },
      ];

      const result = formatScenesSummary(scenes);

      // First scene should use summaryShort
      expect(result).toContain("卡娅发现石板");
      expect(result).toContain("[场景1 · 第一章]");

      // Second scene has no summary, should fall back to content slice
      expect(result).toContain("另一个场景的完整内容...");
    });
  });
});
