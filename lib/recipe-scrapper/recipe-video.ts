import type {
  RecipeVideoEvidence,
  RecipeVideoInput,
  RecipeVideoOptions,
} from "~/types/RecipeVideo";

/** Metro selects the native implementation on iOS and Android. */
export async function readRecipeVideo(
  _input: RecipeVideoInput,
  _options?: RecipeVideoOptions
): Promise<RecipeVideoEvidence> {
  throw new Error(
    "Video importing is available in the iOS and Android app. Paste the full recipe caption here."
  );
}
