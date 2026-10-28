import type { pantryApi } from "~/data/api/pantryApi";
import type { PantryItem as AppPantryItem } from "~/types/PantryItem";
import type { CookingDataClient, PantryItem } from "./planning";

type PantryApi = Pick<typeof pantryApi, "fetchAllPantryItemsResult" | "manageAssistantPantry">;

function toAgentItem(item: AppPantryItem, includeChangeMetadata = false): PantryItem {
  return {
    id: item.id,
    ...(item.base_ingredient_id !== undefined ? { baseIngredientId: item.base_ingredient_id } : {}),
    name: item.name,
    ...(includeChangeMetadata
      ? { storageType: item.type, updatedAt: item.updated_at?.toISOString() }
      : {}),
    quantity: item.quantity,
    unit: item.unit,
    expiryDate: item.expiry_date?.toISOString() ?? null,
    householdId: null,
    addedByUserId: null,
  };
}

/** Keep agent pantry operations on the same local store as the pantry screen. */
export function withLocalPantry(
  data: CookingDataClient,
  pantry: PantryApi,
  onChanged: () => void
): CookingDataClient {
  const manage: NonNullable<CookingDataClient["managePantry"]> = async (input) => {
    try {
      const result = await pantry.manageAssistantPantry(input);
      if (!result.ok) return result;
      onChanged();
      return "item" in result
        ? { ...result, item: toAgentItem(result.item, true) }
        : { ...result, removed: result.removed.map((item) => toAgentItem(item, true)) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Couldn't update that ingredient.",
      };
    }
  };
  return {
    ...data,
    managePantry: manage,
    async listPantry() {
      const result = await pantry.fetchAllPantryItemsResult();
      if (result.isErr()) throw new Error(result.error.message);
      return result.value.map((item) => toAgentItem(item));
    },
    async addIngredient(input) {
      const result = await manage({ ...input, action: "add" });
      if (!result.ok || "item" in result) return result;
      return { ok: false, error: "The pantry add did not return an item." };
    },
    async removeIngredient(input) {
      const result = await manage({ ...input, action: "remove" });
      if (!result.ok || "removed" in result) return result;
      return { ok: false, error: "The pantry removal did not return its entries." };
    },
  };
}
