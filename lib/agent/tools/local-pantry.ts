import type { pantryApi } from "~/data/api/pantryApi";
import type { PantryItem as AppPantryItem } from "~/types/PantryItem";
import type { CookingDataClient, PantryItem } from "./planning";

type PantryApi = Pick<
  typeof pantryApi,
  "fetchAllPantryItems" | "addPantryItem" | "deletePantryItem"
>;

function toAgentItem(item: AppPantryItem): PantryItem {
  return {
    id: item.id,
    name: item.name,
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
  return {
    ...data,
    async listPantry() {
      return (await pantry.fetchAllPantryItems()).map(toAgentItem);
    },
    async addIngredient(input) {
      try {
        const item = await pantry.addPantryItem({
          name: input.name,
          quantity: input.quantity ?? 1,
          unit: input.unit ?? "count",
          type: "fridge",
          category: "other",
          image_url: undefined,
          background_color: undefined,
          steps_to_store: [],
        });
        onChanged();
        return { ok: true, item: toAgentItem(item) };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Couldn't add that ingredient.",
        };
      }
    },
    async removeIngredient(input) {
      const removed: PantryItem[] = [];
      try {
        const name = input.name?.trim().toLowerCase();
        if (!input.stockId && !name) return { ok: false, error: "Say which ingredient to remove." };
        const items = await this.listPantry();
        const matches = items.filter((item) =>
          input.stockId ? item.id === input.stockId : item.name.trim().toLowerCase() === name
        );
        for (const item of matches) {
          await pantry.deletePantryItem(item.id);
          removed.push(item);
        }
        return { ok: true, removed };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Couldn't remove that ingredient.",
        };
      } finally {
        // Refresh even if a later deletion in a multi-row removal fails.
        if (removed.length > 0) onChanged();
      }
    },
  };
}
