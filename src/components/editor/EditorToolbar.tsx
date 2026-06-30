"use client";

import { useRouter } from "next/navigation";

interface AIModelInfo {
  label: string;
  desc: string;
}

interface Props {
  storyTitle: string;
  saveStatus: "idle" | "saving" | "saved" | "error";
  aiGenerating: boolean;
  extracting: boolean;
  aiModels: Record<string, AIModelInfo>;
  aiModel: string;
  contentEmpty: boolean;
  onModelChange: (model: string) => void;
  onAIContinue: () => void;
  onAIExtract: () => void;
  onManualSave: () => void;
}

/** Editor header toolbar — navigation, AI controls, save */
export function EditorToolbar({
  storyTitle,
  saveStatus,
  aiGenerating,
  extracting,
  aiModels,
  aiModel,
  contentEmpty,
  onModelChange,
  onAIContinue,
  onAIExtract,
  onManualSave,
}: Props) {
  const router = useRouter();

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: back + story title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="text-sm text-zinc-400 hover:text-zinc-600 shrink-0"
          >
            &larr; 返回
          </button>
          <div className="h-4 w-px bg-zinc-200" />
          <span className="text-sm text-zinc-400 truncate">{storyTitle}</span>
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-2">
          {/* Save status */}
          <span className="text-xs text-zinc-400">
            {aiGenerating && "AI 生成中..."}
            {extracting && "AI 抽取中..."}
            {!aiGenerating && !extracting && saveStatus === "saving" && "保存中..."}
            {!aiGenerating && !extracting && saveStatus === "saved" && "✓ 已保存"}
            {!aiGenerating && !extracting && saveStatus === "error" && "⚠ 保存失败"}
          </span>

          {/* Model selector */}
          {Object.keys(aiModels).length > 0 && (
            <select
              value={aiModel}
              onChange={(e) => onModelChange(e.target.value)}
              title={aiModels[aiModel]?.desc || ""}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-[11px] bg-white text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(aiModels).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          )}

          {/* AI Continue */}
          <button
            onClick={onAIContinue}
            disabled={aiGenerating || contentEmpty}
            title={contentEmpty ? "请先输入内容后再续写" : "AI 将根据前文内容和故事设定续写"}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {aiGenerating ? "生成中..." : "✨ AI 续写"}
          </button>

          {/* AI Extract */}
          <button
            onClick={onAIExtract}
            disabled={extracting || contentEmpty}
            title={contentEmpty ? "请先输入内容后再抽取" : "AI 将从此场景中提取人物、地点、事件和伏笔"}
            className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {extracting ? "抽取中..." : "🔍 AI 抽取"}
          </button>

          {/* Manual save */}
          <button
            onClick={onManualSave}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
          >
            保存
          </button>
        </div>
      </div>
    </header>
  );
}
