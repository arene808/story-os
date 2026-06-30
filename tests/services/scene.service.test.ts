// ============================================================
// Story OS — Scene Service Tests
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  getScene,
  createScene,
  updateScene,
  deleteScene,
  listScenesByStory,
} from "@/lib/services/scene.service";
import { createStory } from "@/lib/services/story.service";

beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g["__story_os_scene_store__"];
  delete g["__story_os_story_store__"];
  try { fs.unlinkSync(path.join(process.cwd(), "data", "scenes.json")); } catch {}
  try { fs.unlinkSync(path.join(process.cwd(), "data", "stories.json")); } catch {}
});

describe("scene.service", () => {
  let storyId: string;

  beforeEach(async () => {
    const story = await createStory({ title: "测试故事" });
    storyId = story.id;
  });

  describe("createScene", () => {
    it("should create a scene with required fields", async () => {
      const scene = await createScene({
        storyId,
        title: "第一章",
        content: "这是一个测试场景的内容。",
      });

      expect(scene.id).toBeDefined();
      expect(scene.title).toBe("第一章");
      expect(scene.content).toBe("这是一个测试场景的内容。");
      expect(scene.status).toBe("draft");
      expect(scene.wordCount).toBeGreaterThan(0);
      expect(scene.sortOrder).toBe(0); // first scene
    });

    it("should auto-increment sortOrder", async () => {
      const s1 = await createScene({ storyId, title: "A" });
      const s2 = await createScene({ storyId, title: "B" });

      expect(s1.sortOrder).toBe(0);
      expect(s2.sortOrder).toBe(1);
    });

    it("should count CJK words correctly", async () => {
      const scene = await createScene({
        storyId,
        title: "测试",
        content: "你好世界这是一段测试文字",
      });

      // 12 CJK characters (no spaces counted)
      expect(scene.wordCount).toBe(12);
    });
  });

  describe("getScene", () => {
    it("should return null for non-existent scene", async () => {
      const result = await getScene("no-such-scene");
      expect(result).toBeNull();
    });

    it("should retrieve a created scene", async () => {
      const created = await createScene({ storyId, title: "取回测试" });
      const retrieved = await getScene(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.title).toBe("取回测试");
    });
  });

  describe("listScenesByStory", () => {
    it("should return scenes sorted by sortOrder", async () => {
      await createScene({ storyId, title: "B" }); // sortOrder 0
      await createScene({ storyId, title: "C" }); // sortOrder 1
      await createScene({ storyId, title: "A" }); // sortOrder 2

      const scenes = await listScenesByStory(storyId);
      expect(scenes.length).toBe(3);
      expect(scenes[0].sortOrder).toBe(0);
      expect(scenes[1].sortOrder).toBe(1);
      expect(scenes[2].sortOrder).toBe(2);
    });
  });

  describe("updateScene", () => {
    it("should update content and recalculate wordCount", async () => {
      const created = await createScene({
        storyId,
        title: "原文",
        content: "原内容",
      });

      const updated = await updateScene(created.id, {
        content: "新的内容更加丰富",
      });

      expect(updated).not.toBeNull();
      expect(updated!.content).toBe("新的内容更加丰富");
      expect(updated!.wordCount).toBe(8); // "新的内容更加丰富" = 8 CJK chars
    });

    it("should update status", async () => {
      const created = await createScene({ storyId, title: "草稿" });
      expect(created.status).toBe("draft");

      const updated = await updateScene(created.id, { status: "canon" });
      expect(updated!.status).toBe("canon");
    });
  });

  describe("deleteScene", () => {
    it("should delete a scene", async () => {
      const created = await createScene({ storyId, title: "待删除" });
      const result = await deleteScene(created.id);
      expect(result).toBe(true);

      const retrieved = await getScene(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Draft → Canon transition", () => {
    it("should allow changing status from draft to canon", async () => {
      const scene = await createScene({
        storyId,
        title: "待确认",
        content: "这是AI生成的续写内容。",
        status: "draft",
      });

      expect(scene.status).toBe("draft");

      const updated = await updateScene(scene.id, {
        content: "用户编辑后的最终内容。",
        status: "canon",
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("canon");
      expect(updated!.content).toBe("用户编辑后的最终内容。");
    });
  });
});
