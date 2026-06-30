// ============================================================
// Story OS — POST /api/scenes/[id]/canonize
//
// Approves an AI draft and promotes its content to the scene.
// This is the ONLY path for AI-generated content to become canon.
//
// Flow:
//   1. Verify draft exists and is in 'draft' status
//   2. Mark draft.status = 'canon' (via approveDraft)
//   3. Copy draft.content → scene.content
//   4. Update scene.word_count
//   5. Return updated scene + draft
// ============================================================

import { NextResponse } from "next/server";
import { getDraft, approveDraft } from "@/lib/services/draft.service";
import { getScene, updateScene } from "@/lib/services/scene.service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sceneId } = await params;
    const body = await req.json();
    const { draftId, editedContent } = body;

    if (!draftId || typeof draftId !== "string") {
      return NextResponse.json(
        { error: "draftId is required" },
        { status: 400 }
      );
    }

    // ---- Step 1: Verify scene exists ----
    const scene = await getScene(sceneId);
    if (!scene) {
      return NextResponse.json(
        { error: "Scene not found" },
        { status: 404 }
      );
    }

    // ---- Step 2: Verify draft exists and is pending ----
    const draft = await getDraft(draftId);
    if (!draft) {
      return NextResponse.json(
        { error: "Draft not found" },
        { status: 404 }
      );
    }

    if (draft.sceneId !== sceneId) {
      return NextResponse.json(
        { error: "Draft does not belong to this scene" },
        { status: 400 }
      );
    }

    if (draft.status !== "draft") {
      return NextResponse.json(
        { error: `Draft has already been ${draft.status === "canon" ? "approved" : "rejected"}` },
        { status: 400 }
      );
    }

    // ---- Step 3: Approve the draft ----
    const approvedDraft = await approveDraft(draftId);
    if (!approvedDraft) {
      return NextResponse.json(
        { error: "Failed to approve draft" },
        { status: 500 }
      );
    }

    // ---- Step 4: Update scene content with draft content ----
    // Use editedContent if user modified the draft before approving
    const finalContent = editedContent ?? draft.content;
    const updatedScene = await updateScene(sceneId, {
      content: finalContent,
      status: "canon", // promote scene to canon if it was draft
    });

    if (!updatedScene) {
      return NextResponse.json(
        { error: "Failed to update scene" },
        { status: 500 }
      );
    }

    // ---- Step 5: Return result ----
    return NextResponse.json({
      scene: {
        id: updatedScene.id,
        title: updatedScene.title,
        content: updatedScene.content,
        wordCount: updatedScene.wordCount,
        status: updatedScene.status,
      },
      draft: {
        id: approvedDraft.id,
        status: approvedDraft.status,
      },
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[scenes/canonize] Error:", msg);
    return NextResponse.json(
      { error: "服务器错误", detail: msg },
      { status: 500 }
    );
  }
}
