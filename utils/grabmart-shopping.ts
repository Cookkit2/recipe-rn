export interface GrabMartShoppingItem {
  name: string;
  neededQuantity: number;
  unit: string;
  isChecked: boolean;
  isCovered: boolean;
}

// Grab's Malaysia GrabMart page uses this destination in its Order Now link:
// https://www.grab.com/my/mart/
export const GRABMART_DEEP_LINK = "grab://open?screenType=GRABMART";
// The launch link forces grab:// again on mobile. Use a plain webpage if the app is absent.
export const GRABMART_FALLBACK_URL = "https://www.grab.com/my/mart/";

export type GrabMartShoppingResult = "empty" | "opened" | "copied";

/** One line per remaining ingredient, using quantities after pantry subtraction. */
export function formatGrabMartShoppingList(items: readonly GrabMartShoppingItem[]): string {
  return items
    .filter(
      (item) =>
        !item.isChecked &&
        !item.isCovered &&
        Number.isFinite(item.neededQuantity) &&
        item.neededQuantity > 0
    )
    .map((item) => {
      // Keep small amounts positive while removing floating-point subtraction noise.
      const quantity = Number(item.neededQuantity.toPrecision(6));
      return `${item.name.trim()} — ${quantity} ${item.unit.trim()}`.trim();
    })
    .join("\n");
}
