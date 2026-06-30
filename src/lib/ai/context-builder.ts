// ============================================================
// Story OS — AI Context Builder
//
// Assembles the context needed for AI calls from the 5-layer
// memory system. MVP: uses L0 (raw_text), L1 (summaries),
// and L3 (story bible — story metadata only for now).
//
// L2 (vector search) and L4 (event ledger) are not yet wired.
// ============================================================

import { getStory } from "@/lib/services/story.service";
import { getScene, listScenesByStory } from "@/lib/services/scene.service";
import type { Story, Scene } from "@/types";

export interface ContinueContext {
  story: Story;
  currentScene: Scene;
  /** Canon scenes before the current one, ordered by sortOrder ascending */
  previousCanonScenes: Scene[];
  /** Canon scenes after the current one (if any) */
  nextCanonScenes: Scene[];
  /** All canon scenes for this story */
  allCanonScenes: Scene[];
}

/**
 * Build the full context for an AI "continue" call.
 *
 * Gathers:
 *  - The story metadata (title, description, world setting)
 *  - The current scene's full raw_text
 *  - Summaries of nearby canon scenes (up to N before, 1 after if exists)
 */
export async function buildContinueContext(
  sceneId: string,
  options?: {
    maxPreviousScenes?: number; // default 5
    maxNextScenes?: number;     // default 1
  }
): Promise<ContinueContext> {
  const maxPrev = options?.maxPreviousScenes ?? 5;
  const maxNext = options?.maxNextScenes ?? 1;

  const currentScene = await getScene(sceneId);
  if (!currentScene) {
    throw new Error(`Scene not found: ${sceneId}`);
  }

  const story = await getStory(currentScene.storyId);
  if (!story) {
    throw new Error(`Story not found: ${currentScene.storyId}`);
  }

  // Get all scenes for this story
  const allScenes = await listScenesByStory(currentScene.storyId);

  // Filter to canon only
  const canonScenes = allScenes
    .filter((s) => s.status === "canon")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Find current scene's position
  const currentIndex = canonScenes.findIndex((s) => s.id === currentScene.id);

  // Previous canon scenes (not including the current one)
  const previousCanonScenes =
    currentIndex > 0
      ? canonScenes.slice(Math.max(0, currentIndex - maxPrev), currentIndex)
      : [];

  // Next canon scenes
  const nextCanonScenes =
    currentIndex >= 0 && currentIndex < canonScenes.length - 1
      ? canonScenes.slice(currentIndex + 1, currentIndex + 1 + maxNext)
      : [];

  return {
    story,
    currentScene,
    previousCanonScenes,
    nextCanonScenes,
    allCanonScenes: canonScenes,
  };
}

/**
 * Build a human-readable summary string from recent scenes.
 * Used in the prompt's "前文摘要" section.
 */
export function formatScenesSummary(scenes: Scene[]): string {
  if (scenes.length === 0) return "";

  return scenes
    .map((s, i) => {
      const num = i + 1;
      const title = s.title;
      const summary = s.summaryShort || s.summaryLong || s.content.slice(0, 100);
      return `[场景${num} · ${title}]\n${summary}`;
    })
    .join("\n\n");
}
