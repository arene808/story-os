"use client";

import { useState } from "react";
import Link from "next/link";
import type { Branch, Scene } from "@/types";
import { CreateBranchForm } from "./CreateBranchForm";

interface Props { branches: Branch[]; scenes: Scene[]; storyId: string; }

const BT_ICON: Record<string, string> = { mainline: "📖", side_story: "📚", what_if: "❓", alternative_ending: "🔮" };
const BT_LABEL: Record<string, string> = { mainline: "主线", side_story: "支线", what_if: "IF 线", alternative_ending: "替代结局" };
const BT_COLOR: Record<string, string> = { mainline: "border-l-green-500", side_story: "border-l-blue-500", what_if: "border-l-amber-500", alternative_ending: "border-l-purple-500" };
const SS_STYLE: Record<string, string> = { canon: "bg-green-50 text-green-700 border-green-200", draft: "bg-amber-50 text-amber-700 border-amber-200", archived: "bg-zinc-50 text-zinc-500 border-zinc-200", alternative: "bg-purple-50 text-purple-700 border-purple-200" };
const SS_LABEL: Record<string, string> = { canon: "正史", draft: "草稿", archived: "归档", alternative: "平行" };

interface BranchNode extends Branch { children: BranchNode[]; scenes: Scene[]; }

function buildTree(branches: Branch[], scenes: Scene[]): BranchNode[] {
  const roots: BranchNode[] = [];
  const map = new Map<string, BranchNode>();
  for (const b of branches) map.set(b.id, { ...b, children: [], scenes: [] });
  for (const node of map.values()) {
    node.scenes = scenes.filter((s) => s.branchId === node.id).sort((a, b) => a.sortOrder - b.sortOrder);
    if (node.parentBranchId && map.has(node.parentBranchId)) map.get(node.parentBranchId)!.children.push(node);
    else roots.push(node);
  }
  roots.sort((a, b) => a.branchType === "mainline" ? -1 : b.branchType === "mainline" ? 1 : a.name.localeCompare(b.name));
  return roots;
}

export function BranchTreeView({ branches, scenes, storyId }: Props) {
  const tree = buildTree(branches, scenes);
  const [creating, setCreating] = useState<string | null>(null);

  if (branches.length === 0) {
    return (
      <div className="space-y-2">
        {scenes.sort((a, b) => a.sortOrder - b.sortOrder).map((s, i) => (
          <SceneRow key={s.id} scene={s} index={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tree.map((root) => (
        <NodeView key={root.id} node={root} depth={0} storyId={storyId} creating={creating} onStart={setCreating} onCancel={() => setCreating(null)} />
      ))}
    </div>
  );
}

function NodeView({ node, depth, storyId, creating, onStart, onCancel }: { node: BranchNode; depth: number; storyId: string; creating: string | null; onStart: (id: string) => void; onCancel: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={`border-l-2 ${BT_COLOR[node.branchType] ?? "border-l-zinc-300"} ${depth > 0 ? "ml-6" : ""}`}>
      <div className="pl-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCollapsed(!collapsed)} className="text-[10px] text-zinc-400 hover:text-zinc-600">{collapsed ? "▶" : "▼"}</button>
          <span>{BT_ICON[node.branchType] ?? "📖"}</span>
          <span className="font-semibold text-sm">{node.name}</span>
          <span className="text-[10px] text-zinc-400 bg-zinc-100 rounded px-1.5 py-0.5">{BT_LABEL[node.branchType] ?? node.branchType}</span>
          <span className="text-[10px] text-zinc-400">{node.scenes.length} 场景</span>
        </div>
        {node.description && <p className="text-xs text-zinc-500 mt-1 pl-5">{node.description}</p>}
      </div>
      {!collapsed && (
        <div className="pl-4 space-y-2 mb-3">
          {node.scenes.length === 0 && <p className="text-xs text-zinc-400 italic py-2">暂无场景</p>}
          {node.scenes.map((s, i) => <SceneRow key={s.id} scene={s} index={i} />)}
          {creating === node.id ? (
            <CreateBranchForm storyId={storyId} parentBranchId={node.id} onCreated={onCancel} onCancel={onCancel} />
          ) : (
            <button onClick={() => onStart(node.id)} className="text-[11px] text-zinc-400 hover:text-purple-600 ml-1">+ 创建子分支</button>
          )}
        </div>
      )}
      {!collapsed && node.children.map((c) => <NodeView key={c.id} node={c} depth={depth + 1} storyId={storyId} creating={creating} onStart={onStart} onCancel={onCancel} />)}
    </div>
  );
}

function SceneRow({ scene, index }: { scene: Scene; index: number }) {
  return (
    <Link href={`/scenes/${scene.id}`} className="block rounded-lg border border-zinc-200 bg-white px-4 py-2.5 hover:border-zinc-300 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-zinc-400 w-5 text-right shrink-0">{index + 1}</span>
          <span className="text-sm font-medium truncate">{scene.title}</span>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${SS_STYLE[scene.status] ?? SS_STYLE.draft}`}>{SS_LABEL[scene.status] ?? scene.status}</span>
        </div>
        <span className="text-[10px] text-zinc-400 shrink-0">{scene.wordCount} 字</span>
      </div>
    </Link>
  );
}
