import { NextResponse } from "next/server";
import { createScene, listScenesByStory } from "@/lib/services/scene.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");

    if (!storyId) {
      return NextResponse.json(
        { error: "storyId query parameter is required" },
        { status: 400 }
      );
    }

    const scenes = await listScenesByStory(storyId);
    return NextResponse.json(scenes);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storyId, title, content, status, parentSceneId, branchId } = body;

    if (!storyId || typeof storyId !== "string") {
      return NextResponse.json(
        { error: "storyId is required" },
        { status: 400 }
      );
    }
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const scene = await createScene({
      storyId,
      title: title.trim(),
      content: content ?? "",
      status,
      parentSceneId: parentSceneId ?? null,
      branchId: branchId ?? null,
    });

    return NextResponse.json(scene, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
