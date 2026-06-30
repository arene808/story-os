import Link from "next/link";
import { notFound } from "next/navigation";
import { loadStoryDetail } from "@/lib/data-source";
import { NewSceneForm } from "@/components/scene/NewSceneForm";
import type { Scene, Branch } from "@/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  canon: "bg-green-50 text-green-700 border-green-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-zinc-50 text-zinc-500 border-zinc-200",
  alternative: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_LABEL: Record<string, string> = {
  canon: "正史",
  draft: "草稿",
  archived: "已归档",
  alternative: "平行分支",
};

function getScenesByBranch(scenes: Scene[], branchId: string): Scene[] {
  return scenes
    .filter((s) => s.branchId === branchId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const data = await loadStoryDetail(storyId);

  if (!data) {
    notFound();
  }

  const { story, scenes, branches, characters, events } = data;
  const mainBranch = branches.find((b) => b.parentBranchId === null) ?? branches[0];
  const altBranches = branches.filter((b) => b.parentBranchId !== null);

  // If no branches exist, synthesize a default main branch
  const displayBranches = branches.length > 0 ? branches : [
    { id: "_main", storyId: story.id, name: "主线", description: "", parentBranchId: null, createdAt: "" },
  ];
  const displayMainBranch = mainBranch ?? displayBranches[0];
  const displayAltBranches = branches.length > 0 ? altBranches : [];

  // Scenes without an explicit branch go to main
  const mainScenes = branches.length > 0
    ? getScenesByBranch(scenes, displayMainBranch.id)
    : scenes.sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/stories" className="hover:text-zinc-600">
          故事列表
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-600">{story.title}</span>
      </nav>

      {/* Story header */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{story.title}</h1>
            <p className="text-zinc-500 mt-2 max-w-2xl">
              {story.description || "暂无简介"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 border border-green-200">
            进行中
          </span>
        </div>

        {/* World setting */}
        {story.worldSetting && (
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
            <span className="text-xs font-medium text-blue-600">世界观设定</span>
            <p className="text-sm text-blue-800 mt-1">{story.worldSetting}</p>
          </div>
        )}

        {/* Quick stats */}
        <div className="flex gap-6 mt-4 text-sm text-zinc-500">
          <span>{scenes.length} 个场景</span>
          <span>{characters.length} 个人物</span>
          <span>{events.length} 个事件</span>
        </div>
      </div>

      {/* Scenes section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            场景列表
          </h2>
          <NewSceneForm storyId={story.id} />
        </div>

        {mainScenes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
            <p className="text-zinc-400 mb-2">还没有场景</p>
            <p className="text-zinc-300 text-sm">
              点击「新建场景」开始写作
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mainScenes.map((scene, idx) => (
              <Link
                key={scene.id}
                href={`/scenes/${scene.id}`}
                className="block rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
              >
                <SceneCardContent scene={scene} index={idx} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Alternative branches */}
      {displayAltBranches.map((branch) => {
        const branchScenes = getScenesByBranch(scenes, branch.id);
        if (branchScenes.length === 0) return null;
        return (
          <section key={branch.id} className="mb-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
              {branch.name}
            </h2>
            {branch.description && (
              <p className="text-sm text-zinc-500 mb-4 -mt-2">{branch.description}</p>
            )}
            <div className="space-y-3">
              {branchScenes.map((scene, idx) => (
                <Link
                  key={scene.id}
                  href={`/scenes/${scene.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
                >
                  <SceneCardContent scene={scene} index={idx} />
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {/* Characters section */}
      {characters.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">人物</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {characters.map((char) => (
              <div
                key={char.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{char.name}</span>
                  {char.isMajor && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      主要
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500 line-clamp-2">
                  {char.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events timeline */}
      {events.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">事件时间线</h2>
          <div className="space-y-2">
            {events.map((event, idx) => (
              <div
                key={event.id}
                className="flex items-start gap-4 rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-xs font-mono font-bold text-zinc-400">
                    {idx + 1}
                  </span>
                  <div className="w-px flex-1 bg-zinc-200 mt-1" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{event.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {event.eventTime}
                  </p>
                  {event.description && (
                    <p className="text-sm text-zinc-600 mt-1">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Extract scene card content as a presentational component
function SceneCardContent({ scene, index }: { scene: Scene; index: number }) {
  const statusClass = STATUS_STYLE[scene.status] ?? STATUS_STYLE.draft;
  const statusLabel = STATUS_LABEL[scene.status] ?? scene.status;

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 text-xs font-mono text-zinc-400 w-6 text-right">
            {index + 1}
          </span>
          <h3 className="font-semibold truncate">{scene.title}</h3>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>

      {scene.summaryShort && (
        <p className="text-sm text-zinc-600 mb-3 line-clamp-2">
          {scene.summaryShort}
        </p>
      )}

      {!scene.summaryShort && scene.content && (
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2 italic">
          {scene.content.slice(0, 120)}
        </p>
      )}

      {!scene.summaryShort && !scene.content && (
        <p className="text-sm text-zinc-300 mb-3 italic">空内容 — 点击编辑</p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
        <span>{scene.wordCount} 字</span>
        <span>·</span>
        <span>更新于 {new Date(scene.updatedAt).toLocaleDateString("zh-CN")}</span>
      </div>
    </>
  );
}
