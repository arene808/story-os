import { NextResponse } from "next/server";
import { listByStory, create } from "@/lib/services/character.service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storyId = searchParams.get("storyId");
  if (!storyId) return NextResponse.json({ error: "storyId required" }, { status: 400 });
  return NextResponse.json(await listByStory(storyId));
}

export async function POST(req: Request) {
  try {
    const { storyId, name, description, isMajor } = await req.json();
    if (!storyId || !name) return NextResponse.json({ error: "storyId and name required" }, { status: 400 });
    return NextResponse.json(await create({ storyId, name, description, isMajor }), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
