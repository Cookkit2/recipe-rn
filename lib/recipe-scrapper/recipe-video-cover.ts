import type { RecipeVideoEvidence, RecipeVideoOptions } from "~/types/RecipeVideo";
/** Native apps sample decoded public-player video frames. */
export async function readRecipeVideoCoverFrames(
  _url: string,
  _options: RecipeVideoOptions = {}
): Promise<RecipeVideoEvidence["frames"]> {
  return [];
}
