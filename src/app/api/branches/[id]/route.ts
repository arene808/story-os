import { NextResponse } from "next/server";
import { getBranch, deleteBranch } from "@/lib/services/branch.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getBranch(id);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(b);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await deleteBranch((await params).id);
  return NextResponse.json({ ok: true });
}
