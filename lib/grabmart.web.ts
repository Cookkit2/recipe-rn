import { shopForIngredients } from "./ingredient-shopping";
import type { GrabMartShoppingItem, GrabMartShoppingResult } from "~/utils/grabmart-shopping";
export function shopOnGrabMart(
  items: readonly GrabMartShoppingItem[]
): Promise<GrabMartShoppingResult> {
  return shopForIngredients("grabmart", items);
}
