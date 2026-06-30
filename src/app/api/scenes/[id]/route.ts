import { NextResponse } from "next/server";
import { getScene, updateScene, deleteScene } from "@/lib/services/scene.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scene = await getScene(id);
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    return NextResponse.json(scene);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content, status, summaryShort, summaryLong, sortOrder, parentSceneId } = body;

    const scene = await updateScene(id, {
      title,
      content,
      status,
      summaryShort,
      summaryLong,
      sortOrder,
      parentSceneId,
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    return NextResponse.json(scene);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteScene(id);
    if (!deleted) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
