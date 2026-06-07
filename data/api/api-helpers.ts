/**
 * Shared API helpers for pantry and related operations.
 *
 * Eliminates duplication between throw-based and Result-based API variants
 * by extracting common data-preparation and resolution logic.
 */

import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";
import type { PantryItem } from "~/types/PantryItem";
import { log } from "~/utils/logger";

/**
 * Resolve a base-ingredient ID from the cloud API.
 * Falls back to a deterministic temp ID when the cloud lookup fails.
 */
export async function resolveBaseIngredientId(name: string): Promise<string> {
  let baseIngredientId = `temp_${name.toLowerCase().replace(/\s+/g, "_")}`;
  try {
    const cloudIngredient = await baseIngredientApi.getBaseIngredientByName(name);
    if (cloudIngredient && cloudIngredient.id) {
      baseIngredientId = cloudIngredient.id;
    }
  } catch (err) {
    log.warn("Failed to fetch base_ingredient_id from cloud API, falling back to temp ID", err);
  }
  return baseIngredientId;
}

/**
 * Build the stock-data object expected by `databaseFacade.createStock`.
 * Centralises the PantryItem → Stock field mapping so it isn't duplicated
 * across the throw-based and Result-based add-pantry-item variants.
 */
export function prepareStockData(
  item: Omit<PantryItem, "id" | "created_at" | "updated_at">,
  baseIngredientId: string
) {
  return {
    baseIngredientId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiry_date,
    type: item.type,
    backgroundColor: item.background_color,
    category: item.category,
    imageUrl: typeof item.image_url === "string" ? item.image_url : undefined,
  };
}
