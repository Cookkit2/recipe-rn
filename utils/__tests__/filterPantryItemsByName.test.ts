import { filterPantryItemsByName } from "../filterPantryItemsByName";
import type { PantryItem } from "~/types/PantryItem";

describe("filterPantryItemsByName", () => {
  const mockItems: PantryItem[] = [
    {
      id: "1",
      name: "Apple",
      quantity: 5,
      unit: "pcs",
      type: "fridge",
      image_url: undefined,
      background_color: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      steps_to_store: [],
      category: "Fruit",
    },
    {
      id: "2",
      name: "Banana",
      quantity: 3,
      unit: "pcs",
      type: "cabinet",
      image_url: undefined,
      background_color: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      steps_to_store: [],
      category: "Fruit",
    },
    {
      id: "3",
      name: "Pineapple",
      quantity: 1,
      unit: "pcs",
      type: "fridge",
      image_url: undefined,
      background_color: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      steps_to_store: [],
      category: "Fruit",
    },
    {
      id: "4",
      name: "Milk",
      quantity: 1,
      unit: "L",
      type: "fridge",
      image_url: undefined,
      background_color: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      steps_to_store: [],
      category: "Dairy",
    },
  ];

  it("should return an empty array if query is empty", () => {
    expect(filterPantryItemsByName(mockItems, "")).toEqual([]);
  });

  it("should return an empty array if query contains only whitespace", () => {
    expect(filterPantryItemsByName(mockItems, "   ")).toEqual([]);
  });

  it("should return correct items matching an exact name (case insensitive)", () => {
    const result = filterPantryItemsByName(mockItems, "bAnAnA");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Banana");
  });

  it("should return correct items matching a partial substring (case insensitive)", () => {
    const result = filterPantryItemsByName(mockItems, "apple");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["Apple", "Pineapple"]);
  });

  it("should return an empty array when query does not match any items", () => {
    expect(filterPantryItemsByName(mockItems, "Orange")).toEqual([]);
  });

  it("should handle empty items array", () => {
    expect(filterPantryItemsByName([], "Apple")).toEqual([]);
  });

  it("should handle query with leading/trailing whitespaces correctly", () => {
    const result = filterPantryItemsByName(mockItems, "  milk  ");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Milk");
  });
});
