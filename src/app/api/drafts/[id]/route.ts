// ============================================================
// Story OS — /api/drafts/[id]
//
// PATCH: update draft (e.g., reject)
// ============================================================

import { NextResponse } from "next/server";
import { getDraft, rejectDraft } from "@/lib/services/draft.service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const draft = await getDraft(id);
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (status === "rejected") {
      const updated = await rejectDraft(id);
      if (!updated) {
        return NextResponse.json({ error: "Failed to reject draft" }, { status: 500 });
      }
      return NextResponse.json({ draft: updated });
    }

    return NextResponse.json(
      { error: `Unsupported status transition: ${status}` },
      { status: 400 }
    );
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[drafts] Error:", msg);
    return NextResponse.json(
      { error: "服务器错误", detail: msg },
      { status: 500 }
    );
  }
}
