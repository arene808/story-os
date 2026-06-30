// ============================================================
// Story OS — Story Service Tests
// Uses in-memory fallback (no database required)
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  listStories,
  getStory,
  createStory,
  updateStory,
  deleteStory,
} from "@/lib/services/story.service";

// Clear in-memory store and data files before each test
beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g["__story_os_story_store__"];
  // Clean up persisted data from previous test runs
  try { fs.unlinkSync(path.join(process.cwd(), "data", "stories.json")); } catch {}
});

describe("story.service", () => {
  describe("createStory", () => {
    it("should create a story with required fields", async () => {
      const story = await createStory({
        title: "测试故事",
        description: "这是一个测试故事",
        genre: "科幻",
        worldSetting: "未来世界",
      });

      expect(story.id).toBeDefined();
      expect(story.title).toBe("测试故事");
      expect(story.description).toBe("这是一个测试故事");
      expect(story.genre).toBe("科幻");
      expect(story.worldSetting).toBe("未来世界");
      expect(story.status).toBe("active");
      expect(story.userId).toBe("default");
      expect(story.createdAt).toBeDefined();
      expect(story.updatedAt).toBeDefined();
    });

    it("should create stories with different titles", async () => {
      const s1 = await createStory({ title: "故事A" });
      const s2 = await createStory({ title: "故事B" });

      expect(s1.id).not.toBe(s2.id);
      expect(s1.title).toBe("故事A");
      expect(s2.title).toBe("故事B");
    });
  });

  describe("getStory", () => {
    it("should return null for non-existent story", async () => {
      const result = await getStory("non-existent-id");
      expect(result).toBeNull();
    });

    it("should retrieve a created story", async () => {
      const created = await createStory({ title: "取回测试" });
      const retrieved = await getStory(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe("取回测试");
    });
  });

  describe("listStories", () => {
    it("should include seeded mock data when DB is unavailable", async () => {
      const stories = await listStories();
      // Mock data includes "烬海纪元" (1 story)
      expect(stories.length).toBeGreaterThanOrEqual(1);
      expect(stories.some((s) => s.title === "烬海纪元")).toBe(true);
    });

    it("should list all created stories plus mock data", async () => {
      await createStory({ title: "故事一" });
      await createStory({ title: "故事二" });
      await createStory({ title: "故事三" });

      const stories = await listStories();
      // 1 mock story + 3 new stories = 4
      expect(stories.length).toBe(4);
    });
  });

  describe("updateStory", () => {
    it("should update story fields", async () => {
      const created = await createStory({ title: "原标题" });
      const updated = await updateStory(created.id, {
        title: "新标题",
        status: "archived",
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe("新标题");
      expect(updated!.status).toBe("archived");
    });

    it("should return null for non-existent story", async () => {
      const result = await updateStory("no-such-id", { title: "X" });
      expect(result).toBeNull();
    });
  });

  describe("deleteStory", () => {
    it("should delete a story", async () => {
      const created = await createStory({ title: "待删除" });
      const result = await deleteStory(created.id);

      expect(result).toBe(true);

      const retrieved = await getStory(created.id);
      expect(retrieved).toBeNull();
    });
  });
});
