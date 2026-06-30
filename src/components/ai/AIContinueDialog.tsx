"use client";

import { useState, useCallback, useEffect } from "react";
import { ReferenceInput, type SceneReference } from "./ReferenceInput";
import type { DraftInfo } from "./DraftReviewPanel";

interface Props {
  open: boolean;
  sceneId: string;
  storyId: string;
  aiModel: string;
  onClose: () => void;
  onGenerated: (draft: DraftInfo) => void;
}

/**
 * AIContinueDialog — modal for configuring and triggering AI continue.
 *
 * Supports:
 *  - Direction text with @-mention of existing scenes
 *  - Scene reference with optional passage selection
 *  - Target word count
 *  - Style hint
 */
export function AIContinueDialog({
  open,
  sceneId,
  storyId,
  aiModel,
  onClose,
  onGenerated,
}: Props) {
  const [direction, setDirection] = useState("");
  const [references, setReferences] = useState<SceneReference[]>([]);
  const [targetWordCount, setTargetWordCount] = useState(500);
  const [styleHint, setStyleHint] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setDirection("");
      setReferences([]);
      setTargetWordCount(500);
      setStyleHint("");
      setError("");
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !generating) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, generating, onClose]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/ai/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId,
          targetWordCount,
          direction: direction || undefined,
          styleHint: styleHint || undefined,
          references: references.length > 0 ? references : undefined,
          model: aiModel || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI 续写失败");
      }

      const result = await res.json();
      onGenerated(result.draft);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [sceneId, targetWordCount, direction, styleHint, references, aiModel, onGenerated, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={generating ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">✨ AI 续写</h2>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none disabled:opacity-30"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Direction with @ reference */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              续写方向 <span className="text-zinc-400 font-normal">（可选）</span>
            </label>
            <ReferenceInput
              storyId={storyId}
              value={direction}
              onChange={setDirection}
              references={references}
              onReferencesChange={setReferences}
              placeholder="描述续写方向…（输入 @ 引用已有场景）"
            />
            <p className="text-xs text-zinc-400 mt-1">
              输入 @ 可引用已有场景，点击 📎 可选取具体文段作为参考
            </p>
          </div>

          {/* Target word count */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              目标字数
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(Number(e.target.value))}
                className="flex-1 accent-blue-600"
              />
              <span className="text-sm font-mono text-zinc-600 w-12 text-right">
                {targetWordCount}
              </span>
            </div>
          </div>

          {/* Style hint */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              风格提示 <span className="text-zinc-400 font-normal">（可选）</span>
            </label>
            <input
              type="text"
              value={styleHint}
              onChange={(e) => setStyleHint(e.target.value)}
              placeholder="例如：紧张悬疑、温情舒缓、对白为主…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-5 py-3 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {references.length > 0
              ? `已引用 ${references.length} 个场景`
              : "未引用额外场景"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={generating}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {generating ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  生成中…
                </>
              ) : (
                "生成续写"
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-200 text-sm text-red-600 rounded-b-2xl">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
