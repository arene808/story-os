"use client";

import { useState, useCallback } from "react";

// Lightweight type matching what the AI continue API returns
export interface DraftInfo {
  id: string;
  sceneId: string;
  content: string;
  wordCount: number;
  status: string;
}

interface Props {
  draft: DraftInfo;
  sceneContent: string;
  sceneId: string;
  onApproved: () => void;
  onRejected: () => void;
}

/**
 * DraftReviewPanel — review, edit, approve or reject an AI-generated draft.
 *
 * Per AGENTS.md §2.2 Draft/Canon iron law:
 *   AI output → drafts table → user review → approve (canonize) or reject
 */
export function DraftReviewPanel({ draft, sceneContent, sceneId, onApproved, onRejected }: Props) {
  const [editedContent, setEditedContent] = useState(draft.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCompare, setShowCompare] = useState(false);

  const handleApprove = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/scenes/${sceneId}/canonize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draft.id,
          editedContent,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "确认失败");
      }

      onApproved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [draft.id, sceneId, editedContent, onApproved]);

  const handleReject = useCallback(async () => {
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "废弃失败");
      }

      onRejected();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [draft.id, onRejected]);

  const wordCount = editedContent.trim()
    ? editedContent.trim().replace(/\s/g, "").length
    : 0;

  return (
    <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-200 bg-amber-100/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="font-semibold text-amber-900">AI 续写草稿 — 待审核</h3>
        </div>
        <span className="text-xs text-amber-600">
          约 {wordCount} 字
        </span>
      </div>

      {/* Editable draft content */}
      <div className="px-5 py-4">
        <label className="block text-xs font-medium text-amber-700 mb-1">
          AI 生成内容（可直接编辑）
        </label>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full min-h-[200px] resize-y rounded-lg border border-amber-300 p-4 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white font-mono"
          placeholder="AI 生成的内容将显示在这里..."
        />

        {/* Compare toggle */}
        <button
          onClick={() => setShowCompare(!showCompare)}
          className="mt-2 text-xs text-amber-600 hover:text-amber-800 underline"
        >
          {showCompare ? "隐藏原文对比" : "对比原文"}
        </button>

        {showCompare && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-white p-4 max-h-[200px] overflow-y-auto">
            <p className="text-xs font-medium text-amber-500 mb-1">原文</p>
            <pre className="text-sm text-zinc-600 whitespace-pre-wrap font-mono">
              {sceneContent || "(空)"}
            </pre>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-amber-200 bg-amber-100/30">
        <div className="text-xs text-amber-600">
          ⚠️ 确认后 AI 生成内容将覆盖当前场景，成为正史
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReject}
            disabled={saving}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {saving ? "处理中..." : "废弃"}
          </button>
          <button
            onClick={handleApprove}
            disabled={saving}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "确认中..." : "✓ 确认为正史"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-2 bg-red-50 border-t border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
