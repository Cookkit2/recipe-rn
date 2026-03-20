import type { GroceryItem } from "~/hooks/queries/useGroceryList";
import {
  computeEstimatedMyrTotal,
  estimateLineMyr,
  type PriceEstimateRow,
} from "../grocery-price-estimate";

function item(partial: Partial<GroceryItem> & Pick<GroceryItem, "normalizedName">): GroceryItem {
  return {
    name: partial.name ?? partial.normalizedName,
    normalizedName: partial.normalizedName,
    totalQuantity: partial.totalQuantity ?? 2,
    unit: partial.unit ?? "piece",
    neededQuantity: partial.neededQuantity ?? 2,
    pantryQuantity: partial.pantryQuantity ?? 0,
    fromRecipes: partial.fromRecipes ?? [],
    category: partial.category ?? "other",
    isChecked: partial.isChecked ?? false,
    isCovered: partial.isCovered ?? false,
  };
}

describe("computeEstimatedMyrTotal", () => {
  it("sums lines when units match", () => {
    const items = [item({ normalizedName: "onion", neededQuantity: 2, unit: "piece" })];
    const map = new Map<string, PriceEstimateRow>([
      ["onion", { ingredientKey: "onion", priceMyr: 3, bundleQuantity: 1, bundleUnit: "piece" }],
    ]);
    const r = computeEstimatedMyrTotal(items, map);
    expect(r.totalMyr).toBe(6);
    expect(r.pricedLineCount).toBe(1);
    expect(r.unpricedLineCount).toBe(0);
  });

  it("counts unpriced when unit mismatches", () => {
    const items = [item({ normalizedName: "milk", neededQuantity: 500, unit: "ml" })];
    const map = new Map<string, PriceEstimateRow>([
      ["milk", { ingredientKey: "milk", priceMyr: 8, bundleQuantity: 1, bundleUnit: "l" }],
    ]);
    const r = computeEstimatedMyrTotal(items, map);
    expect(r.totalMyr).toBe(0);
    expect(r.pricedLineCount).toBe(0);
    expect(r.unpricedLineCount).toBe(1);
  });

  it("ignores zero neededQuantity", () => {
    const items = [item({ normalizedName: "salt", neededQuantity: 0 })];
    const map = new Map<string, PriceEstimateRow>([
      ["salt", { ingredientKey: "salt", priceMyr: 2, bundleQuantity: 1, bundleUnit: "piece" }],
    ]);
    const r = computeEstimatedMyrTotal(items, map);
    expect(r.totalMyr).toBe(0);
    expect(r.pricedLineCount).toBe(0);
    expect(r.unpricedLineCount).toBe(0);
  });
});

describe("estimateLineMyr", () => {
  it("returns scaled MYR when unit matches", () => {
    const i = item({ normalizedName: "onion", neededQuantity: 3, unit: "piece" });
    const map = new Map<string, PriceEstimateRow>([
      ["onion", { ingredientKey: "onion", priceMyr: 2, bundleQuantity: 1, bundleUnit: "piece" }],
    ]);
    expect(estimateLineMyr(i, map)).toBe(6);
  });

  it("returns null on unit mismatch", () => {
    const i = item({ normalizedName: "milk", neededQuantity: 1, unit: "cup" });
    const map = new Map<string, PriceEstimateRow>([
      ["milk", { ingredientKey: "milk", priceMyr: 8, bundleQuantity: 1, bundleUnit: "l" }],
    ]);
    expect(estimateLineMyr(i, map)).toBeNull();
  });
});
