import { storage } from "~/data";
import type { SharedRecipeInput, PendingRecipeShare } from "~/types/SharedRecipe";
import { normalizeSharedRecipe } from "~/utils/shared-recipe";
const KEY = "pending_recipe_share";
export function savePendingRecipeShare(input: SharedRecipeInput): PendingRecipeShare {
  const pending = { ...input, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };
  storage.set(KEY, JSON.stringify(pending));
  return pending;
}
export function readPendingRecipeShare(): PendingRecipeShare | null {
  try {
    const raw = storage.get<string>(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.id !== "string") return null;
    const source = normalizeSharedRecipe({
      webUrl: typeof parsed.url === "string" ? parsed.url : undefined,
      text: typeof parsed.text === "string" ? parsed.text : undefined,
    });
    return source ? { ...source, id: parsed.id } : null;
  } catch {
    return null;
  }
}
export function clearPendingRecipeShare(id: string): void {
  if (readPendingRecipeShare()?.id === id) storage.delete(KEY);
}
