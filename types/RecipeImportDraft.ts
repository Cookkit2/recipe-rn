import type { GeneratedRecipe, YouTubeImportResult } from "./ScrappedRecipe";

export interface RecipeImportDraft {
  recipe: GeneratedRecipe;
  warnings: string[];
}

export type RecipeImportPreparation =
  { kind: "review"; draft: RecipeImportDraft } | { kind: "saved"; result: YouTubeImportResult };
