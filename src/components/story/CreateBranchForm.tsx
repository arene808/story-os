"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BranchType } from "@/types";

interface Props {
  storyId: string;
  parentBranchId: string | null;
  onCreated: () => void;
  onCancel: () => void;
}

const BRANCH_TYPES: { value: BranchType; label: string; desc: string }[] = [
  { value: "mainline", label: "📖 主线", desc: "核心叙事线" },
  { value: "side_story", label: "📚 支线", desc: "并行次要叙事" },
  { value: "what_if", label: "❓ IF 线", desc: "假设不同选择" },
  { value: "alternative_ending", label: "🔮 替代结局", desc: "不同结局走向" },
];

export function CreateBranchForm({ storyId, parentBranchId, onCreated, onCancel }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [branchType, setBranchType] = useState<BranchType>("side_story");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("请输入分支名称"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId, name: name.trim(), description: description.trim(), branchType, parentBranchId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "创建失败"); }
      onCreated();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally { setSaving(false); }
  }, [name, description, branchType, storyId, parentBranchId, onCreated, router]);

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-3">
      <span className="text-sm font-medium text-purple-800">新建分支{parentBranchId ? "（子分支）" : ""}</span>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="分支名称" className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" autoFocus />
      <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简短描述（可选）" className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
      <div className="flex flex-wrap gap-1.5">
        {BRANCH_TYPES.map((bt) => (
          <button key={bt.value} type="button" onClick={() => setBranchType(bt.value)} title={bt.desc}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${branchType === bt.value ? "bg-purple-600 text-white border-purple-600" : "bg-white text-zinc-600 border-zinc-300 hover:border-purple-300"}`}>
            {bt.label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded border border-zinc-300 px-3 py-1.5 text-xs">取消</button>
        <button type="submit" disabled={saving} className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50">{saving ? "创建中..." : "创建分支"}</button>
      </div>
    </form>
  );
}
