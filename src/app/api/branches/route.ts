import { NextResponse } from "next/server";
import { listBranches, createBranch } from "@/lib/services/branch.service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");
    if (!storyId) return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    return NextResponse.json(await listBranches(storyId));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storyId, name, description, branchType, parentBranchId } = body;
    if (!storyId || !name) return NextResponse.json({ error: "storyId and name are required" }, { status: 400 });
    const branch = await createBranch({ storyId, name: name.trim(), description, branchType, parentBranchId: parentBranchId ?? null });
    return NextResponse.json(branch, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
