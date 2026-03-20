import type { GroceryItem } from "~/hooks/queries/useGroceryList";

export interface PriceEstimateRow {
  ingredientKey: string;
  priceMyr: number;
  bundleQuantity: number;
  bundleUnit: string;
}

function normalizeUnit(u: string): string {
  return u.trim().toLowerCase();
}

/**
 * Sum estimated MYR for grocery lines using per-ingredient bundle prices.
 * When units match (normalized string), scales by neededQuantity / bundleQuantity.
 */
export function computeEstimatedMyrTotal(
  items: GroceryItem[],
  estimatesByKey: Map<string, PriceEstimateRow>
): {
  totalMyr: number;
  pricedLineCount: number;
  unpricedLineCount: number;
} {
  let totalMyr = 0;
  let pricedLineCount = 0;
  let unpricedLineCount = 0;

  for (const item of items) {
    if (item.neededQuantity <= 0) {
      continue;
    }

    const est = estimatesByKey.get(item.normalizedName);
    if (!est || est.bundleQuantity <= 0 || est.priceMyr < 0) {
      unpricedLineCount += 1;
      continue;
    }

    if (normalizeUnit(item.unit) !== normalizeUnit(est.bundleUnit)) {
      unpricedLineCount += 1;
      continue;
    }

    const line = (item.neededQuantity / est.bundleQuantity) * est.priceMyr;
    if (Number.isFinite(line)) {
      totalMyr += line;
      pricedLineCount += 1;
    } else {
      unpricedLineCount += 1;
    }
  }

  return {
    totalMyr: Math.round(totalMyr * 100) / 100,
    pricedLineCount,
    unpricedLineCount,
  };
}

/**
 * Estimated MYR for a single grocery line, or null when no matching estimate or unit mismatch.
 */
export function estimateLineMyr(
  item: GroceryItem,
  estimatesByKey: Map<string, PriceEstimateRow>
): number | null {
  if (item.neededQuantity <= 0) {
    return null;
  }

  const est = estimatesByKey.get(item.normalizedName);
  if (!est || est.bundleQuantity <= 0 || est.priceMyr < 0) {
    return null;
  }

  if (normalizeUnit(item.unit) !== normalizeUnit(est.bundleUnit)) {
    return null;
  }

  const line = (item.neededQuantity / est.bundleQuantity) * est.priceMyr;
  if (!Number.isFinite(line)) {
    return null;
  }

  return Math.round(line * 100) / 100;
}
