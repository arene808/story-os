"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Scene, SceneStatus } from "@/types";
import type { ExtractionResult } from "@/lib/ai/prompts";
import { ExtractionPanel } from "./ExtractionPanel";
import { DraftReviewPanel, type DraftInfo } from "@/components/ai/DraftReviewPanel";
import { StatusSelector } from "./StatusSelector";
import { EditorToolbar } from "./EditorToolbar";
import { AIContinueDialog } from "@/components/ai/AIContinueDialog";

interface Props {
  scene: Scene;
  storyTitle: string;
}

export function SceneEditor({ scene: initialScene, storyTitle }: Props) {
  const [title, setTitle] = useState(initialScene.title);
  const [content, setContent] = useState(initialScene.content);
  const [status, setStatus] = useState<SceneStatus>(initialScene.status);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  // AI state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiModels, setAiModels] = useState<Record<string, { label: string; desc: string }>>({});
  const [aiModel, setAiModel] = useState("");
  const [draftInfo, setDraftInfo] = useState<DraftInfo | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  // AI extract state
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extractionSaving, setExtractionSaving] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const lastSavedContent = useRef(initialScene.content);

  // ---- Save logic ----
  const doSave = useCallback(
    async (data: { title?: string; content?: string; status?: SceneStatus }) => {
      setSaveStatus("saving");
      setError("");
      try {
        const res = await fetch(`/api/scenes/${initialScene.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "保存失败");
        }
        setSaveStatus("saved");
        lastSavedContent.current = content;
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        setSaveStatus("error");
        setError((e as Error).message);
      }
    },
    [initialScene.id, content]
  );

  const handleContentChange = useCallback(
    (value: string) => {
      setContent(value);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => doSave({ content: value }), 2000);
    },
    [doSave]
  );

  const handleTitleBlur = useCallback(() => {
    if (title !== initialScene.title) doSave({ title });
  }, [title, initialScene.title, doSave]);

  const handleStatusChange = useCallback(
    (newStatus: SceneStatus) => {
      setStatus(newStatus);
      doSave({ status: newStatus });
    },
    [doSave]
  );

  // ---- AI Continue ----
  const handleAIContinue = useCallback(async () => {
    // Save current content first, then open the config dialog
    await doSave({ title, content, status });
    setAiDialogOpen(true);
  }, [title, content, status, doSave]);

  const handleAIGenerated = useCallback(
    (draft: DraftInfo) => {
      setDraftInfo(draft);
    },
    []
  );

  // ---- AI Extract ----
  const handleAIExtract = useCallback(async () => {
    setExtracting(true);
    setAiError("");
    setExtraction(null);
    try {
      await doSave({ title, content, status });
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId: initialScene.id, model: aiModel || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI 抽取失败");
      }
      const data = await res.json();
      if (data.extraction) {
        setExtraction(data.extraction);
      } else {
        throw new Error("AI 返回了空结果");
      }
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setExtracting(false);
    }
  }, [initialScene.id, title, content, status, aiModel, doSave]);

  // ---- Extraction confirm ----
  const handleExtractionConfirm = useCallback(
    async (result: ExtractionResult) => {
      setExtractionSaving(true);
      const { storyId } = initialScene;
      try {
        await fetch(`/api/scenes/${initialScene.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summaryShort: result.summaryShort,
            summaryLong: result.summaryLong,
            factsAdded: result.factsAdded,
            openThreads: result.openThreads,
          }),
        });
        for (const char of result.characters) {
          if (char.name.trim()) {
            await fetch("/api/characters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storyId, name: char.name, description: char.description, isMajor: char.isNew }) });
          }
        }
        for (const ev of result.events) {
          if (ev.title.trim()) {
            await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storyId, sceneId: initialScene.id, title: ev.title, description: ev.description, eventTime: ev.eventTime }) });
          }
        }
        setExtraction(null);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        setAiError((e as Error).message);
      } finally {
        setExtractionSaving(false);
      }
    },
    [initialScene.id]
  );

  // ---- Draft approve/reject ----
  const handleDraftApproved = useCallback(async () => {
    setDraftInfo(null);
    const res = await fetch(`/api/scenes/${initialScene.id}`);
    if (res.ok) {
      const data = await res.json();
      setContent(data.content);
      setTitle(data.title);
      setStatus(data.status);
      lastSavedContent.current = data.content;
    }
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [initialScene.id]);

  // ---- Fetch AI models on mount ----
  useEffect(() => {
    fetch("/api/ai/continue")
      .then((r) => r.json())
      .then((data) => {
        if (data.models) { setAiModels(data.models); if (data.defaultModel) setAiModel(data.defaultModel); }
      })
      .catch(() => {});
  }, []);

  // ---- Cleanup ----
  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }, []);

  const wordCount = content.trim() ? content.trim().replace(/\s/g, "").length : 0;
  const displayError = error || aiError;

  return (
    <div className="flex flex-col h-full min-h-screen">
      <EditorToolbar
        storyTitle={storyTitle}
        saveStatus={saveStatus}
        aiGenerating={aiGenerating}
        extracting={extracting}
        aiModels={aiModels}
        aiModel={aiModel}
        contentEmpty={!content.trim()}
        onModelChange={setAiModel}
        onAIContinue={handleAIContinue}
        onAIExtract={handleAIExtract}
        onManualSave={() => doSave({ title, content, status })}
      />

      <div className="flex-1 mx-auto max-w-4xl w-full px-4 py-8">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full text-2xl font-bold border-none outline-none mb-2 bg-transparent placeholder:text-zinc-300"
          placeholder="场景标题"
        />

        <StatusSelector status={status} onChange={handleStatusChange} />

        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="在这里写作你的故事..."
          className="w-full min-h-[60vh] resize-y border border-zinc-200 rounded-lg p-5 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />

        <div className="flex items-center justify-between mt-4 text-xs text-zinc-400">
          <span>约 {wordCount} 字</span>
          <span>自动保存已开启 &middot; 暂停输入 2 秒后保存</span>
        </div>

        {aiGenerating && (
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            AI 正在根据故事设定和前文内容生成续写...
          </div>
        )}

        {extracting && (
          <div className="mt-4 rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-700 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
            AI 正在分析场景，提取人物、地点、事件和伏笔...
          </div>
        )}

        {extraction && (
          <ExtractionPanel
            extraction={extraction}
            onConfirm={handleExtractionConfirm}
            onReject={() => setExtraction(null)}
            saving={extractionSaving}
          />
        )}

        {draftInfo && (
          <DraftReviewPanel
            draft={draftInfo}
            sceneContent={content}
            sceneId={initialScene.id}
            onApproved={handleDraftApproved}
            onRejected={() => setDraftInfo(null)}
          />
        )}

        {displayError && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {displayError}
          </div>
        )}
      </div>

      {/* AI Continue dialog */}
      <AIContinueDialog
        open={aiDialogOpen}
        sceneId={initialScene.id}
        storyId={initialScene.storyId}
        aiModel={aiModel}
        onClose={() => setAiDialogOpen(false)}
        onGenerated={handleAIGenerated}
      />
    </div>
  );
}
