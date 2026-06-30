"use client";

import type { SceneStatus } from "@/types";

const STATUS_OPTIONS: { value: SceneStatus; label: string; desc: string }[] = [
  { value: "draft", label: "草稿", desc: "编辑中，未确认" },
  { value: "canon", label: "正史", desc: "已确认，AI 将以这些内容为准" },
  { value: "alternative", label: "平行分支", desc: "非主线的替代叙事" },
  { value: "archived", label: "归档", desc: "不再使用但保留" },
];

interface Props {
  status: SceneStatus;
  onChange: (status: SceneStatus) => void;
}

/** Scene status selector — pill-style buttons */
export function StatusSelector({ status, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-xs text-zinc-400">状态:</span>
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
            status === opt.value
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-400"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
