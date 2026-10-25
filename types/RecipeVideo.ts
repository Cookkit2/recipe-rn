import type { AIImage } from "~/lib/ai/types";

export type RecipeVideoPhase = "reading-video" | "transcribing-video";
export interface RecipeVideoEvidence {
  title: string;
  caption: string;
  transcript: string;
  frames: (AIImage & { timestamp: number })[];
  warnings: string[];
}
export interface RecipeVideoInput {
  url?: string;
  videoUri?: string;
  language?: string;
}
export interface RecipeVideoOptions {
  signal?: AbortSignal;
  onPhase?: (phase: RecipeVideoPhase) => void;
}
