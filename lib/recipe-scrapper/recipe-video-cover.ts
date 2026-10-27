import type { RecipeVideoEvidence, RecipeVideoOptions } from "~/types/RecipeVideo";
export async function readRecipePlayerEvidence(
  _url: string,
  _options: RecipeVideoOptions = {}
): Promise<RecipeVideoEvidence> {
  return { title: "", caption: "", transcript: "", frames: [], warnings: [] };
}
/** Native apps sample decoded public-player video frames. */
export async function readRecipeVideoCoverFrames(
  _url: string,
  _options: RecipeVideoOptions = {}
): Promise<RecipeVideoEvidence["frames"]> {
  return [];
}
