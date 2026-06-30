"use client";

import { useState, useCallback } from "react";
import type { Story } from "@/types";

interface Props {
  story: Story | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteConfirmDialog({ story, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = useCallback(async () => {
    if (!story) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/stories/${story.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "删除失败"); }
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  }, [story, onDeleted]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-2">确认删除</h2>
        <p className="text-sm text-zinc-600 mb-1">
          确定要删除 <span className="font-semibold text-zinc-900">「{story.title}」</span> 吗？
        </p>
        <p className="text-xs text-red-500 mb-4">
          此操作不可撤销，故事及其所有场景、人物、事件将被永久删除。
        </p>
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleting} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm">取消</button>
          <button onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
            {deleting ? "删除中..." : "确认删除"}
          </button>
        </div>
      </div>
    </div>
  );
}
