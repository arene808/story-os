"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Scene } from "@/types";
import { SceneTextSelector, type SelectedPassage } from "./SceneTextSelector";

export interface SceneReference {
  sceneId: string;
  sceneTitle: string;
  /** If set, only this passage is referenced; otherwise the whole scene */
  passage: string | null;
}

interface Props {
  storyId: string;
  value: string;
  onChange: (value: string) => void;
  references: SceneReference[];
  onReferencesChange: (refs: SceneReference[]) => void;
  placeholder?: string;
}

/**
 * ReferenceInput — a textarea that supports @-mention of existing scenes.
 *
 * Typing "@" triggers a scene search dropdown. Selecting a scene adds it
 * as a reference chip. Each chip can open SceneTextSelector to pick a
 * specific passage from that scene.
 */
export function ReferenceInput({
  storyId,
  value,
  onChange,
  references,
  onReferencesChange,
  placeholder = "描述续写方向…（输入 @ 引用已有场景）",
}: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [sceneList, setSceneList] = useState<Scene[]>([]);
  const [filterText, setFilterText] = useState("");
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [selectingScene, setSelectingScene] = useState<Scene | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch scenes on mount
  useEffect(() => {
    fetch(`/api/scenes?storyId=${storyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSceneList(data.filter((s: Scene) => s.status === "canon"));
        } else if (data.scenes) {
          setSceneList(data.scenes.filter((s: Scene) => s.status === "canon"));
        }
      })
      .catch(() => {});
  }, [storyId]);

  // ---- @ detection ----
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Find the last @ position
      const cursorPos = e.target.selectionStart ?? newValue.length;
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Only show dropdown if @ is followed by non-space chars (or empty)
        // and there's no space between @ and cursor
        const hasSpace = /\s/.test(textAfterAt);
        if (!hasSpace) {
          setFilterText(textAfterAt);
          setShowDropdown(true);
          // Position dropdown below textarea
          if (textareaRef.current) {
            const rect = textareaRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
          }
          return;
        }
      }
      setShowDropdown(false);
    },
    [onChange]
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    // Delay to avoid immediate close
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  // ---- Scene selection from dropdown ----
  const handleSelectScene = useCallback(
    (scene: Scene) => {
      // Check if already referenced
      if (references.some((r) => r.sceneId === scene.id)) {
        setShowDropdown(false);
        return;
      }

      // Remove the @query from the text
      const cursorPos = textareaRef.current?.selectionStart ?? value.length;
      const textBefore = value.slice(0, cursorPos);
      const textAfter = value.slice(cursorPos);
      const lastAtIndex = textBefore.lastIndexOf("@");
      const newText = textBefore.slice(0, lastAtIndex) + textAfter;
      onChange(newText);

      // Add reference (initially without specific passage)
      onReferencesChange([
        ...references,
        { sceneId: scene.id, sceneTitle: scene.title, passage: null },
      ]);

      setShowDropdown(false);

      // Refocus textarea
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [value, references, onChange, onReferencesChange]
  );

  // ---- Passage selection ----
  const handlePassageSelected = useCallback(
    (passage: SelectedPassage) => {
      setSelectingScene(null);
      onReferencesChange(
        references.map((r) =>
          r.sceneId === passage.sceneId ? { ...r, passage: passage.text } : r
        )
      );
    },
    [references, onReferencesChange]
  );

  const handleRemoveReference = useCallback(
    (sceneId: string) => {
      onReferencesChange(references.filter((r) => r.sceneId !== sceneId));
    },
    [references, onReferencesChange]
  );

  // Filtered scenes
  const filteredScenes = filterText
    ? sceneList.filter(
        (s) =>
          s.title.toLowerCase().includes(filterText.toLowerCase()) &&
          !references.some((r) => r.sceneId === s.id)
      )
    : sceneList.filter((s) => !references.some((r) => r.sceneId === s.id));

  return (
    <div className="relative">
      {/* Reference chips */}
      {references.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {references.map((ref) => (
            <span
              key={ref.sceneId}
              className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700"
            >
              📄 {ref.sceneTitle}
              {ref.passage && (
                <span className="text-blue-400" title={ref.passage.slice(0, 50)}>
                  · 已选文段
                </span>
              )}
              <button
                onClick={() => {
                  const scene = sceneList.find((s) => s.id === ref.sceneId);
                  if (scene) setSelectingScene(scene);
                }}
                className="ml-0.5 text-blue-400 hover:text-blue-600"
                title="选取具体文段"
              >
                📎
              </button>
              <button
                onClick={() => handleRemoveReference(ref.sceneId)}
                className="ml-0.5 text-blue-400 hover:text-red-500"
                title="移除引用"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-zinc-400 resize-none"
      />

      {/* Scene search dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-72 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          {filteredScenes.length === 0 ? (
            <div className="px-3 py-2 text-xs text-zinc-400">
              {sceneList.length === 0
                ? "加载中…"
                : "无匹配场景"}
            </div>
          ) : (
            filteredScenes.slice(0, 10).map((scene) => (
              <button
                key={scene.id}
                onClick={() => handleSelectScene(scene)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-zinc-100 last:border-b-0"
              >
                <span className="font-medium text-zinc-800">{scene.title}</span>
                <span className="text-xs text-zinc-400 ml-2">
                  {scene.wordCount} 字
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Scene text selector modal */}
      {selectingScene && (
        <SceneTextSelector
          scene={selectingScene}
          onConfirm={handlePassageSelected}
          onCancel={() => setSelectingScene(null)}
        />
      )}
    </div>
  );
}
