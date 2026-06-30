// ============================================================
// Story OS — Core Type Definitions
// ============================================================

/** Scene status lifecycle */
export type SceneStatus = "draft" | "canon" | "archived" | "alternative";

/** Story project status */
export type StoryStatus = "active" | "archived";

/** Draft lifecycle status */
export type DraftStatus = "draft" | "canon" | "rejected";

/** AI action types */
export type AIAction = "continue" | "expand" | "polish" | "compress" | "rewrite" | "check-contradiction";

// --- Story ---

export interface Story {
  id: string;
  userId: string;
  title: string;
  description: string;
  genre: string;
  worldSetting: string;
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Branch ---

export type BranchType = "mainline" | "side_story" | "what_if" | "alternative_ending";

export interface Branch {
  id: string;
  storyId: string;
  name: string;
  description: string;
  branchType: BranchType;
  parentBranchId: string | null;
  createdAt: string;
}

// --- Scene ---

export interface SceneFact {
  key: string;
  value: string;
  category: string;
}

export interface OpenThread {
  description: string;
  status: "open" | "hinted" | "resolved";
  relatedSceneId?: string;
}

export interface Scene {
  id: string;
  storyId: string;
  branchId: string | null;
  parentSceneId: string | null;
  title: string;
  content: string;
  summaryShort: string;
  summaryLong: string;
  sortOrder: number;
  status: SceneStatus;
  wordCount: number;
  factsAdded: SceneFact[];
  openThreads: OpenThread[];
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// --- Draft ---

export interface Draft {
  id: string;
  sceneId: string;
  userId: string;
  content: string;
  aiAction: AIAction;
  aiModel: string;
  aiPrompt: string;
  status: DraftStatus;
  wordCount: number;
  createdAt: string;
  confirmedAt: string | null;
  rejectedAt: string | null;
}

// --- Character ---

export interface CharacterRelation {
  characterId: string;
  characterName: string;
  relation: string;
}

export interface Character {
  id: string;
  storyId: string;
  userId: string;
  name: string;
  aliases: string;
  description: string;
  appearance: string;
  personality: string;
  background: string;
  motivations: string;
  relationships: CharacterRelation[];
  notes: string;
  isMajor: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Location ---

export type LocationType = "city" | "building" | "natural" | "realm" | "other";

export interface Location {
  id: string;
  storyId: string;
  userId: string;
  name: string;
  description: string;
  type: LocationType;
  parentLocationId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// --- World Fact ---

export interface WorldFact {
  id: string;
  storyId: string;
  userId: string;
  key: string;
  value: string;
  category: string;
  sourceSceneId: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Event ---

export interface StoryEvent {
  id: string;
  storyId: string;
  sceneId: string | null;
  title: string;
  description: string;
  eventTime: string;
  eventOrder: number;
  createdAt: string;
}

// --- Foreshadowing ---

export type ForeshadowingStatus = "planted" | "hinted" | "resolved";

export interface Foreshadowing {
  id: string;
  storyId: string;
  description: string;
  plantedSceneId: string | null;
  resolvedSceneId: string | null;
  status: ForeshadowingStatus;
  createdAt: string;
  resolvedAt: string | null;
}

// --- Scene-Character join (for display) ---

export interface SceneCharacter {
  id: string;
  sceneId: string;
  characterId: string;
  role: "appears" | "mentioned" | "pov" | "narrator";
  notes: string;
}

// --- Scene Embedding ---

export interface SceneEmbedding {
  id: string;
  sceneId: string;
  chunkIndex: number;
  chunkText: string;
  embedding: number[]; // float32[1536]
  tokenCount: number;
  createdAt: string;
}

// --- Story Settings ---

export type SceneNamingPattern = "chapter" | "scene" | "part" | "custom";

export interface StorySettings {
  id: string;
  storyId: string;
  userId: string;
  defaultModel: string;
  defaultTemperature: string;
  styleGuide: string;
  sceneNamingPattern: SceneNamingPattern;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// --- Display helper types ---

export interface SceneWithCharacters extends Scene {
  characters: (Character & { role: string })[];
}

export interface StoryWithScenes extends Story {
  scenes: Scene[];
  branches: Branch[];
}
