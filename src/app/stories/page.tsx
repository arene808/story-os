"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Story } from "@/types";
import { StoryCard } from "@/components/story/StoryCard";
import { NewStoryForm } from "@/components/story/NewStoryForm";
import { EditStoryDialog } from "@/components/story/EditStoryDialog";
import { DeleteConfirmDialog } from "@/components/story/DeleteConfirmDialog";

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"updatedAt" | "title" | "createdAt">("updatedAt");

  // Dialog states
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);

  // Batch select
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const fetchStories = useCallback(async () => {
    const res = await fetch("/api/stories");
    if (res.ok) {
      const data = await res.json();
      setStories(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  // Exit batch mode when filter/search changes
  useEffect(() => { setBatchMode(false); setSelectedIds(new Set()); }, [search, statusFilter, sortBy]);

  // ---- Actions ----
  const handleCopy = useCallback(async (story: Story) => {
    await fetch(`/api/stories/${story.id}/copy`, { method: "POST" });
    await fetchStories();
    router.refresh();
  }, [fetchStories, router]);

  const handleArchive = useCallback(async (story: Story) => {
    const newStatus = story.status === "active" ? "archived" : "active";
    await fetch(`/api/stories/${story.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    await fetchStories();
    router.refresh();
  }, [fetchStories, router]);

  const handleSaved = useCallback(() => { setEditingStory(null); fetchStories(); router.refresh(); }, [fetchStories, router]);
  const handleDeleted = useCallback(() => { setDeletingStory(null); fetchStories(); router.refresh(); }, [fetchStories, router]);

  // ---- Batch operations ----
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  }, [selectedIds, stories, search, statusFilter, sortBy]);

  const handleBatchArchive = useCallback(async () => {
    for (const id of selectedIds) {
      const story = stories.find((s) => s.id === id);
      if (story) {
        const ns = story.status === "active" ? "archived" : "active";
        await fetch(`/api/stories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: ns }) });
      }
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    await fetchStories();
    router.refresh();
  }, [selectedIds, stories, fetchStories, router]);

  const handleBatchDelete = useCallback(async () => {
    setBatchDeleting(true);
    for (const id of selectedIds) {
      await fetch(`/api/stories/${id}`, { method: "DELETE" });
    }
    setBatchDeleting(false);
    setSelectedIds(new Set());
    setBatchMode(false);
    await fetchStories();
    router.refresh();
  }, [selectedIds, fetchStories, router]);

  // ---- Filter & Sort ----
  const filtered = stories
    .filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search && !s.title.includes(search) && !s.description.includes(search)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的故事</h1>
          <p className="text-sm text-zinc-500 mt-1">{stories.length} 个项目</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${batchMode ? "bg-blue-50 border-blue-300 text-blue-700" : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"}`}
          >
            {batchMode ? "退出选择" : "☑ 批量操作"}
          </button>
          <NewStoryForm onCreated={fetchStories} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索故事..." className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "archived")} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-600">
          <option value="all">全部</option><option value="active">进行中</option><option value="archived">已归档</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "updatedAt" | "title" | "createdAt")} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-600">
          <option value="updatedAt">最近更新</option><option value="createdAt">最近创建</option><option value="title">按标题</option>
        </select>
        {batchMode && (
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 ml-2">
            <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
            全选 ({selectedIds.size}/{filtered.length})
          </label>
        )}
        {filtered.length < stories.length && (
          <span className="text-xs text-zinc-400">显示 {filtered.length}/{stories.length}</span>
        )}
      </div>

      {/* Story list */}
      {loading ? (
        <div className="text-center py-16 text-zinc-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-16 text-center">
          <p className="text-zinc-400 text-lg mb-2">{stories.length === 0 ? "还没有故事" : "没有匹配的故事"}</p>
          <p className="text-zinc-300 text-sm">{stories.length === 0 ? "点击「新建故事」创建你的第一个故事" : "尝试修改搜索条件"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onEdit={setEditingStory}
              onCopy={handleCopy}
              onArchive={handleArchive}
              onDelete={setDeletingStory}
              selectable={batchMode}
              selected={selectedIds.has(story.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <EditStoryDialog story={editingStory} onClose={() => setEditingStory(null)} onSaved={handleSaved} />
      <DeleteConfirmDialog story={deletingStory} onClose={() => setDeletingStory(null)} onDeleted={handleDeleted} />

      {/* Batch action bar */}
      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-zinc-200 shadow-lg py-3 px-4">
          <div className="mx-auto max-w-4xl flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">
              已选择 {selectedIds.size} 个项目
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchArchive}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                📦 批量归档/激活
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {batchDeleting ? "删除中..." : `🗑 批量删除 (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
