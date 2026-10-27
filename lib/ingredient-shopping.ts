import Clipboard from "@react-native-clipboard/clipboard";
import { Linking } from "react-native";
import {
  formatGrabMartShoppingList,
  GRABMART_DEEP_LINK,
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
  Clipboard.setString(list);
  return (await openIngredientStore(provider)) ? "opened" : "copied";
}

/** Open a store independently of whether the grocery list has remaining items. */
export async function openIngredientStore(provider: IngredientShoppingProvider): Promise<boolean> {
  const destination = provider === "grabmart" ? GRABMART_DEEP_LINK : FOODPANDA_GROCERY_URL;
  try {
    await Linking.openURL(destination);
  } catch {
    if (provider === "foodpanda") return false;
    try {
      await Linking.openURL(GRABMART_FALLBACK_URL);
    } catch {
      return false;
    }
  }
  return true;
}
