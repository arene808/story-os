"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { Story } from "@/types";

interface Props {
  story: Story;
  onEdit: (story: Story) => void;
  onCopy: (story: Story) => void;
  onArchive: (story: Story) => void;
  onDelete: (story: Story) => void;
  onExport?: (story: Story) => void;
  // Batch select mode
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function StoryCard({ story, onEdit, onCopy, onArchive, onDelete, onExport, selectable, selected, onToggleSelect }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const closeAnd = useCallback((fn: (s: Story) => void) => {
    setMenuOpen(false);
    fn(story);
  }, [story]);

  const handleExport = useCallback(() => {
    setMenuOpen(false);
    window.open(`/api/stories/${story.id}/export`, "_blank");
  }, [story.id]);

  return (
    <div className={`group relative rounded-xl border bg-white hover:shadow-sm transition-all ${selected ? "border-blue-400 ring-2 ring-blue-100" : "border-zinc-200 hover:border-zinc-300"}`}>
      {/* Batch select checkbox */}
      {selectable && (
        <div className="absolute top-4 left-4 z-10">
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onToggleSelect?.(story.id)}
            className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Main clickable area */}
      <Link href={`/stories/${story.id}`} className={`block p-5 ${selectable ? "pl-10" : ""} pr-12`}>
        <h2 className="text-lg font-semibold truncate pr-4">{story.title}</h2>
        <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
          {story.description || "暂无简介"}
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {story.genre &&
            story.genre.split(/[,，]/).map((g) => (
              <span key={g.trim()} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {g.trim()}
              </span>
            ))}
          <span className="text-xs text-zinc-400">
            {story.status === "active" ? "🟢 进行中" : "📦 已归档"}
          </span>
          <span className="text-xs text-zinc-400 ml-auto">
            {new Date(story.updatedAt).toLocaleDateString("zh-CN")}
          </span>
        </div>
      </Link>

      {/* "..." menu button */}
      <div className="absolute top-3 right-3" ref={menuRef}>
        <button
          onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
        >
          ···
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-zinc-200 bg-white shadow-lg z-20 py-1">
            <button onClick={() => closeAnd(onEdit)} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">📝 编辑</button>
            <button onClick={() => closeAnd(onCopy)} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">📋 复制</button>
            <button onClick={() => closeAnd(onArchive)} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">
              {story.status === "active" ? "📦 归档" : "🟢 激活"}
            </button>
            <button onClick={handleExport} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">📥 导出</button>
            <div className="border-t border-zinc-100 my-1" />
            <button onClick={() => closeAnd(onDelete)} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">🗑 删除</button>
          </div>
        )}
      </div>
    </div>
  );
}
