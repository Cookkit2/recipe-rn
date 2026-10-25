import {
  formatGrabMartShoppingList,
  GRABMART_FALLBACK_URL,
  type GrabMartShoppingItem,
  type GrabMartShoppingResult,
} from "~/utils/grabmart-shopping";
export type IngredientShoppingProvider = "grabmart" | "foodpanda";
export const FOODPANDA_GROCERY_URL = "https://www.foodpanda.my/groceries";
export async function shopForIngredients(
  provider: IngredientShoppingProvider,
  items: readonly GrabMartShoppingItem[]
): Promise<GrabMartShoppingResult> {
  const list = formatGrabMartShoppingList(items);
  if (!list) return "empty";
  await navigator.clipboard.writeText(list);
  return (await openIngredientStore(provider)) ? "opened" : "copied";
}

export async function openIngredientStore(provider: IngredientShoppingProvider): Promise<boolean> {
  try {
    window.location.assign(provider === "grabmart" ? GRABMART_FALLBACK_URL : FOODPANDA_GROCERY_URL);
  } catch {
    return false;
  }
  return true;
}
