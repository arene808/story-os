"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Scene } from "@/types";

export interface SelectedPassage {
  sceneId: string;
  sceneTitle: string;
  text: string;
}

interface Props {
  scene: Scene;
  onConfirm: (passage: SelectedPassage) => void;
  onCancel: () => void;
}

/**
 * SceneTextSelector — displays a scene's full text and lets the user
 * highlight a passage to use as AI reference.
 */
export function SceneTextSelector({ scene, onConfirm, onCancel }: Props) {
  const [selection, setSelection] = useState("");
  const textRef = useRef<HTMLDivElement>(null);

  // Capture text selection from the content div
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      setSelection(sel.toString().trim());
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const text = selection || scene.content.slice(0, 200); // fallback: first 200 chars
    onConfirm({
      sceneId: scene.id,
      sceneTitle: scene.title,
      text,
    });
  }, [selection, scene, onConfirm]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200">
          <div>
            <h3 className="font-semibold text-zinc-900">
              选取参考文段
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              来自：{scene.title}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scene text content */}
        <div
          ref={textRef}
          onMouseUp={handleMouseUp}
          className="flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap font-mono select-text cursor-text"
          style={{ minHeight: "200px", maxHeight: "50vh" }}
        >
          {scene.content || "(此场景无内容)"}
        </div>

        {/* Selection preview + actions */}
        <div className="border-t border-zinc-200 px-5 py-3 space-y-3">
          {selection && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800 max-h-24 overflow-y-auto">
              <span className="font-medium text-blue-600">已选中：</span>
              {selection.slice(0, 300)}
              {selection.length > 300 && "…"}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              {selection
                ? `已选 ${selection.replace(/\s/g, "").length} 字`
                : "请用鼠标拖选文段，或直接确认引用开头内容"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                确认引用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
