import { NextResponse } from "next/server";
import { getStory } from "@/lib/services/story.service";
import { listScenesByStory } from "@/lib/services/scene.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const story = await getStory(id);
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const scenes = await listScenesByStory(id);
    const canonScenes = scenes
      .filter((s) => s.status === "canon")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let md = `# ${story.title}\n\n`;
    if (story.description) md += `> ${story.description}\n\n`;
    if (story.genre) md += `**类型**: ${story.genre}  \n`;
    if (story.worldSetting) md += `**世界观**: ${story.worldSetting}  \n`;
    md += `**导出时间**: ${new Date().toLocaleDateString("zh-CN")}  \n\n`;
    md += `---\n\n`;

    for (const scene of canonScenes) {
      md += `## ${scene.title}\n\n`;
      if (scene.summaryShort) md += `*${scene.summaryShort}*\n\n`;
      md += `${scene.content}\n\n`;
      md += `---\n\n`;
    }

    const headers = new Headers();
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(story.title)}.md"`);

    return new NextResponse(md, { status: 200, headers });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
