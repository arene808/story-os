import { NextResponse } from "next/server";
import { listStories, createStory } from "@/lib/services/story.service";

export async function GET() {
  try {
    const stories = await listStories();
    return NextResponse.json(stories);
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
    const { title, description, genre, worldSetting } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const story = await createStory({
      title: title.trim(),
      description,
      genre,
      worldSetting,
    });

    return NextResponse.json(story, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
