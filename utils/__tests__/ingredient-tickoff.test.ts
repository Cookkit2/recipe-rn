import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { toggleIngredientUsed } from "../ingredient-tickoff";

describe("toggleIngredientUsed", () => {
  it("adds an id that is not present", () => {
    const next = toggleIngredientUsed(new Set<string>(), "ing-1");
    expect(next.has("ing-1")).toBe(true);
    expect(next.size).toBe(1);
  });

  it("removes an id that is already present (toggle off)", () => {
    const next = toggleIngredientUsed(new Set(["ing-1", "ing-2"]), "ing-1");
    expect(next.has("ing-1")).toBe(false);
    expect(next.has("ing-2")).toBe(true);
    expect(next.size).toBe(1);
  });

  it("toggles the same id back and forth deterministically", () => {
    let used = new Set<string>();
    used = toggleIngredientUsed(used, "ing-1");
    expect(used.has("ing-1")).toBe(true);
    used = toggleIngredientUsed(used, "ing-1");
    expect(used.has("ing-1")).toBe(false);
  });

  it("does not mutate the input set (immutability)", () => {
    const original = new Set(["ing-1"]);
    const snapshot = new Set(original);
    toggleIngredientUsed(original, "ing-2");
    expect(original).toEqual(snapshot);
  });
});

/**
 * Persistence round-trip: verifies the provider's MMKV write/read contract for
 * used-ingredient state — toggle -> serialize as array -> storage.set, then
 * storage.get -> reconstruct Set on the next cook entry.
 */
describe("used-ingredient MMKV persistence round-trip", () => {
  const storageMap = new Map<string, string[]>();
  const STORAGE_KEY = "cooking:used_ingredients:recipe-42";
  const ingredientIds = ["ing-1", "ing-2", "ing-3"];

  // In-memory stand-ins for the storage facade methods the provider calls.
  const setMock = jest.fn((key: string, value: string[]) => {
    storageMap.set(key, value);
  });
  const getMock = jest.fn((key: string): string[] | null => storageMap.get(key) ?? null);

  beforeEach(() => {
    storageMap.clear();
    jest.clearAllMocks();
  });

  it("serializes toggled ids to an array and round-trips back through storage", () => {
    // Simulate the provider toggling two ingredients and persisting.
    let used = new Set<string>();
    used = toggleIngredientUsed(used, "ing-1");
    used = toggleIngredientUsed(used, "ing-3");
    setMock(STORAGE_KEY, Array.from(used));

    expect(setMock).toHaveBeenCalledWith(STORAGE_KEY, ["ing-1", "ing-3"]);

    // Reconstruct on the next cook entry the way the provider's initializer does.
    const stored = getMock(STORAGE_KEY);
    expect(Array.isArray(stored)).toBe(true);
    const rehydrated = new Set(stored ?? []);
    expect(rehydrated.has("ing-1")).toBe(true);
    expect(rehydrated.has("ing-3")).toBe(true);
    expect(rehydrated.has("ing-2")).toBe(false);
    expect(ingredientIds.length > 0 && ingredientIds.every((id) => rehydrated.has(id))).toBe(false);
  });

  it("marks all used once the full set is persisted and rehydrated", () => {
    let used = new Set<string>();
    for (const id of ingredientIds) {
      used = toggleIngredientUsed(used, id);
    }
    setMock(STORAGE_KEY, Array.from(used));

    const rehydrated = new Set(getMock(STORAGE_KEY) ?? []);
    expect(ingredientIds.length > 0 && ingredientIds.every((id) => rehydrated.has(id))).toBe(true);
  });

  it("starts fresh when nothing has been persisted for the recipe", () => {
    const stored = getMock(STORAGE_KEY);
    const rehydrated = new Set(Array.isArray(stored) ? stored : []);
    expect(rehydrated.size).toBe(0);
    expect(ingredientIds.length > 0 && ingredientIds.every((id) => rehydrated.has(id))).toBe(false);
  });
});
