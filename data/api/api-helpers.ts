/** Explicit pantry presentation ↔ persistence boundaries. */
import type { PantryItem } from "~/types/PantryItem";
import { ingredientCatalog } from "~/data/services/ingredientCatalog";
import { catalogIdentityForName } from "~/data/services/catalogIdentity";
import { ingredientClarification, isSameIngredient } from "~/utils/ingredient-identity";

export type PantryCreateInput = Omit<PantryItem, "id" | "created_at" | "updated_at">;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An unresolved food has no catalog reference. Never manufacture a catalog ID. */
export async function resolveBaseIngredientId(
  name: string,
  suppliedId?: string | null
): Promise<string | null> {
  if (ingredientClarification(name))
    throw new Error("Choose a specific ingredient before saving it.");
  if (suppliedId === null) return null;
  if (suppliedId !== undefined && !UUID.test(suppliedId))
    throw new Error("Invalid base ingredient reference.");
  const resolved = await ingredientCatalog.resolve(name);
  if (suppliedId !== undefined) {
    const supplied = await ingredientCatalog.byId(suppliedId);
    if (supplied && !catalogIdentityForName(supplied, supplied.aliases, name))
      throw new Error("The ingredient name conflicts with its catalog reference.");
    if (!supplied && (await ingredientCatalog.hasSnapshot()))
      throw new Error("The ingredient reference is not in the catalog.");
    if (resolved && resolved.id !== suppliedId)
      throw new Error("The ingredient name conflicts with its catalog reference.");
    // Camera/manual metadata may already contain an authoritative reference while
    // offline before the first dictionary snapshot is available.
    return suppliedId;
  }
  return resolved && UUID.test(resolved.id) ? resolved.id : null;
}

export async function resolvePantryItemReference(item: PantryCreateInput): Promise<string | null> {
  if (
    item.base_ingredient_name &&
    !isSameIngredient(
      item.base_ingredient_name,
      item.name,
      item.synonyms?.map((alias) => alias.synonym)
    )
  ) {
    throw new Error("Conflicting ingredient name metadata.");
  }
  return resolveBaseIngredientId(item.name, item.base_ingredient_id);
}

export function prepareStockData(item: PantryCreateInput, baseIngredientId: string | null) {
  return {
    baseIngredientId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expirationDate: item.expiry_date?.getTime(),
    storageType: item.type,
    backgroundColor: item.background_color,
    imageUrl: typeof item.image_url === "string" ? item.image_url : undefined,
    x: item.x,
    y: item.y,
    scale: item.scale,
  };
}
