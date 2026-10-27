import type { PantryItem } from "~/types/PantryItem";
import { normalizeIngredientIdentity } from "./ingredient-identity";

/** A user name correction must not inherit the previous food's catalog metadata. */
export function clearInheritedCatalogMetadata<
  T extends Pick<PantryItem, "name"> & Partial<PantryItem>,
>(previous: T, next: T): T {
  if (
    normalizeIngredientIdentity(previous.name) === normalizeIngredientIdentity(next.name) ||
    (next.base_ingredient_id && next.base_ingredient_id !== previous.base_ingredient_id)
  )
    return next;
  return {
    ...next,
    base_ingredient_id: undefined,
    base_ingredient_name: undefined,
    synonyms: undefined,
    categories: undefined,
  };
}

/** Full detail-screen snapshots carry inherited nulls, not an explicit clear action. */
export function pantryItemUpdates(previous: PantryItem, next: PantryItem): Partial<PantryItem> {
  const updates = clearInheritedCatalogMetadata(previous, next);
  return {
    ...updates,
    base_ingredient_id:
      updates.base_ingredient_id === previous.base_ingredient_id
        ? undefined
        : updates.base_ingredient_id,
  };
}
