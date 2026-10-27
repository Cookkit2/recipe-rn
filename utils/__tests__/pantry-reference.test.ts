import { clearInheritedCatalogMetadata, pantryItemUpdates } from "../pantry-reference";
import type { PantryItem } from "~/types/PantryItem";
const item = {
  name: "Egg",
  base_ingredient_id: "egg-id",
  base_ingredient_name: "Egg",
  synonyms: [{ id: "alias", synonym: "whole egg" }],
  quantity: 2,
};
it("clears inherited identity metadata on food corrections while preserving batch data", () => {
  expect(clearInheritedCatalogMetadata(item, { ...item, name: "Custom stew" })).toMatchObject({
    name: "Custom stew",
    quantity: 2,
    base_ingredient_id: undefined,
    base_ingredient_name: undefined,
    synonyms: undefined,
  });
});
it("preserves grammatical edits and intentionally supplied replacement metadata", () => {
  expect(clearInheritedCatalogMetadata(item, { ...item, name: "Eggs" })).toEqual({
    ...item,
    name: "Eggs",
  });
  expect(
    clearInheritedCatalogMetadata(item, {
      ...item,
      name: "Milk",
      base_ingredient_id: "milk-id",
      base_ingredient_name: "Milk",
      synonyms: [],
    })
  ).toMatchObject({ base_ingredient_id: "milk-id" });
});

it("does not turn a migrated null in a full detail snapshot into an explicit clear", () => {
  const original = { ...item, base_ingredient_id: null } as unknown as PantryItem;
  expect(
    pantryItemUpdates(original, { ...original, quantity: 9 }).base_ingredient_id
  ).toBeUndefined();
});
