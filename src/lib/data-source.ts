// ============================================================
// Story OS — Data Source
//
// Server-side data access. Calls service layer directly.
// Falls back to mock data when DB is not available.
// ============================================================

import { listStories, getStory } from "@/lib/services/story.service";
import { listScenesByStory, getScene } from "@/lib/services/scene.service";
import { listBranches } from "@/lib/services/branch.service";
import { listByStory as listCharacters } from "@/lib/services/character.service";
import { listByStory as listEvents } from "@/lib/services/event.service";
import type { Story, Scene, Branch, Character, StoryEvent } from "@/types";

export type StoryDetailData = {
  story: Story;
  scenes: Scene[];
  branches: Branch[];
  characters: Character[];
  events: StoryEvent[];
};

/** Load all stories for the story list */
export async function loadStories(): Promise<Story[]> {
  return listStories();
}

/** Load a single story with all related data */
export async function loadStoryDetail(storyId: string): Promise<StoryDetailData | null> {
  const story = await getStory(storyId);
  if (!story) return null;

  const scenes = await listScenesByStory(storyId);
  const branches = await listBranches(storyId); // includes all branches (even empty ones)
  const characters = await listCharacters(storyId);
  const events = await listEvents(storyId);

  return { story, scenes, branches, characters, events };
}

/** Load a scene for editing */
export async function loadSceneForEdit(sceneId: string): Promise<{
  scene: Scene;
  story: Story;
  scenes: Scene[];
} | null> {
  const scene = await getScene(sceneId);
  if (!scene) return null;

  const story = await getStory(scene.storyId);
  if (!story) return null;

  const scenes = await listScenesByStory(scene.storyId);

  return { scene, story, scenes };
}
