import type { PantryItem } from "~/types/PantryItem";
import { filterPantryItemsByName } from "../filterPantryItemsByName";

const base = (overrides: Partial<PantryItem>): PantryItem => ({
  id: "1",
  name: "Tomato",
  type: "fridge",
  quantity: 1,
  unit: "piece",
  category: "veg",
  background_color: undefined,
  image_url: undefined,
  created_at: new Date(),
  updated_at: new Date(),
  steps_to_store: [],
  ...overrides,
});

describe("filterPantryItemsByName", () => {
  it("returns empty when query is blank", () => {
    expect(filterPantryItemsByName([base({})], "")).toEqual([]);
    expect(filterPantryItemsByName([base({})], "   ")).toEqual([]);
  });

  it("matches case-insensitive substring", () => {
    const items = [base({ name: "Cherry Tomato" }), base({ id: "2", name: "Basil" })];
    expect(filterPantryItemsByName(items, "tom")).toEqual([items[0]]);
  });

  it("returns empty when nothing matches", () => {
    expect(filterPantryItemsByName([base({ name: "Salt" })], "pepper")).toEqual([]);
  });
});
