// ============================================================
// Story OS — Draft Service Tests
// Verifies Draft/Canon iron law compliance
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  createDraft,
  getDraft,
  listDraftsByScene,
  listPendingDrafts,
  approveDraft,
  rejectDraft,
  deleteDraft,
} from "@/lib/services/draft.service";
import { createStory } from "@/lib/services/story.service";
import { createScene } from "@/lib/services/scene.service";

beforeEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g["__story_os_draft_store__"];
  delete g["__story_os_scene_store__"];
  delete g["__story_os_story_store__"];
  const d = path.join(process.cwd(), "data");
  try { fs.unlinkSync(path.join(d, "drafts.json")); } catch {}
  try { fs.unlinkSync(path.join(d, "scenes.json")); } catch {}
  try { fs.unlinkSync(path.join(d, "stories.json")); } catch {}
});

describe("draft.service", () => {
  let sceneId: string;

  beforeEach(async () => {
    const story = await createStory({ title: "测试故事" });
    const scene = await createScene({
      storyId: story.id,
      title: "测试场景",
      content: "测试内容",
    });
    sceneId = scene.id;
  });

  describe("createDraft", () => {
    it("should create a draft linked to a scene", async () => {
      const draft = await createDraft({
        sceneId,
        content: "AI 生成的续写内容",
        aiAction: "continue",
      });

      expect(draft.id).toBeDefined();
      expect(draft.sceneId).toBe(sceneId);
      expect(draft.content).toBe("AI 生成的续写内容");
      expect(draft.aiAction).toBe("continue");
      expect(draft.status).toBe("draft");
      expect(draft.confirmedAt).toBeNull();
      expect(draft.rejectedAt).toBeNull();
    });

    it("should track AI model used", async () => {
      const draft = await createDraft({
        sceneId,
        content: "内容",
        aiAction: "polish",
        aiModel: "deepseek-reasoner",
      });

      expect(draft.aiAction).toBe("polish");
      expect(draft.aiModel).toBe("deepseek-reasoner");
    });
  });

  describe("getDraft", () => {
    it("should return null for non-existent draft", async () => {
      const result = await getDraft("no-such-draft");
      expect(result).toBeNull();
    });
  });

  describe("listDraftsByScene", () => {
    it("should list all drafts for a scene", async () => {
      await createDraft({ sceneId, content: "草稿A", aiAction: "continue" });
      await createDraft({ sceneId, content: "草稿B", aiAction: "expand" });

      const drafts = await listDraftsByScene(sceneId);
      expect(drafts.length).toBe(2);
    });

    it("should return empty for scene with no drafts", async () => {
      const drafts = await listDraftsByScene(sceneId);
      expect(drafts).toEqual([]);
    });
  });

  describe("listPendingDrafts", () => {
    it("should only return drafts with status='draft'", async () => {
      const d1 = await createDraft({ sceneId, content: "待审核", aiAction: "continue" });
      const d2 = await createDraft({ sceneId, content: "已确认", aiAction: "continue" });
      await approveDraft(d2.id);

      const pending = await listPendingDrafts(sceneId);
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(d1.id);
    });
  });

  describe("approveDraft", () => {
    it("should set status to canon and set confirmedAt", async () => {
      const draft = await createDraft({
        sceneId,
        content: "待确认内容",
        aiAction: "continue",
      });

      const approved = await approveDraft(draft.id);
      expect(approved).not.toBeNull();
      expect(approved!.status).toBe("canon");
      expect(approved!.confirmedAt).not.toBeNull();
    });

    it("should return null for non-existent draft", async () => {
      const result = await approveDraft("no-such-draft");
      expect(result).toBeNull();
    });
  });

  describe("rejectDraft", () => {
    it("should set status to rejected and set rejectedAt", async () => {
      const draft = await createDraft({
        sceneId,
        content: "被拒绝的内容",
        aiAction: "continue",
      });

      const rejected = await rejectDraft(draft.id);
      expect(rejected).not.toBeNull();
      expect(rejected!.status).toBe("rejected");
      expect(rejected!.rejectedAt).not.toBeNull();
    });
  });

  describe("deleteDraft", () => {
    it("should hard delete a draft", async () => {
      const draft = await createDraft({
        sceneId,
        content: "待删除",
        aiAction: "continue",
      });

      const result = await deleteDraft(draft.id);
      expect(result).toBe(true);

      const retrieved = await getDraft(draft.id);
      expect(retrieved).toBeNull();
    });
  });

  describe("Draft/Canon iron law (AGENTS.md §2.2)", () => {
    it("AI output MUST start as draft status", async () => {
      const draft = await createDraft({
        sceneId,
        content: "AI 生成",
        aiAction: "continue",
      });
      expect(draft.status).toBe("draft");
    });

    it("draft → canon transition is explicit via approveDraft", async () => {
      const draft = await createDraft({
        sceneId,
        content: "AI 生成内容",
        aiAction: "continue",
      });

      // Before approval
      expect(draft.status).toBe("draft");
      expect(draft.confirmedAt).toBeNull();

      // After approval
      const approved = await approveDraft(draft.id);
      expect(approved!.status).toBe("canon");
      expect(approved!.confirmedAt).not.toBeNull();
    });

    it("rejected drafts should not become canon", async () => {
      const draft = await createDraft({
        sceneId,
        content: "AI 生成内容",
        aiAction: "continue",
      });

      await rejectDraft(draft.id);
      const rejected = await getDraft(draft.id);
      expect(rejected!.status).toBe("rejected");

      // Cannot re-approve a rejected draft (should stay rejected)
      const pending = await listPendingDrafts(sceneId);
      expect(pending.length).toBe(0);
    });
  });
});
