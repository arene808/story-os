import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Story OS</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          面向长篇小说作者、剧本作者和世界观创作者的 AI 写作系统。
          管理你的故事、人物、时间线与世界观——让 AI 记住一切。
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/stories"
          className="block rounded-xl border border-zinc-200 bg-white p-6 hover:border-zinc-300 hover:shadow-sm transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">📖 我的故事</h2>
          <p className="text-sm text-zinc-500">
            查看和管理你的故事项目。每个故事包含场景、人物、时间线和世界观设定。
          </p>
          <span className="inline-block mt-4 text-sm font-medium text-blue-600">
            进入 →
          </span>
        </Link>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 opacity-60">
          <h2 className="text-xl font-semibold mb-2">🔮 故事宇宙（即将推出）</h2>
          <p className="text-sm text-zinc-500">
            跨项目的世界观管理、人物库共享、故事分支图谱可视化。
          </p>
          <span className="inline-block mt-4 text-sm text-zinc-400">
            敬请期待
          </span>
        </div>
      </div>
    </div>
  );
}
