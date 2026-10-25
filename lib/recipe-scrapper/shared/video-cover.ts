import type { RecipeVideoEvidence } from "~/types/RecipeVideo";

/** A small actual video frame survives temporary video cleanup and recipe sync. */
export function getRecipeVideoCover(frames: RecipeVideoEvidence["frames"]): string | undefined {
  // The final sampled frame is usually closest to the finished dish.
  const frame = [...frames]
    .reverse()
    .find(
      (frame) =>
        ["image/jpeg", "image/png", "image/webp"].includes(frame.mimeType) &&
        frame.data.length > 0 &&
        frame.data.length <= 180_000 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(frame.data)
    );
  return frame ? `data:${frame.mimeType};base64,${frame.data}` : undefined;
}
