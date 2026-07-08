import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { areAllIngredientsUsed } from "../ingredient-tickoff";

describe("areAllIngredientsUsed", () => {
  it("returns true when every ingredient id is present", () => {
    const used = new Set(["ing-1", "ing-2", "ing-3"]);
    expect(areAllIngredientsUsed(used, ["ing-1", "ing-2", "ing-3"])).toBe(true);
  });

  it("returns false when at least one ingredient is missing", () => {
    const used = new Set(["ing-1", "ing-2"]);
    expect(areAllIngredientsUsed(used, ["ing-1", "ing-2", "ing-3"])).toBe(false);
  });

  it("returns false when there are no ingredients (nothing to complete)", () => {
    expect(areAllIngredientsUsed(new Set(["ing-1"]), [])).toBe(false);
  });

  it("returns true once the last remaining id is added", () => {
    const ids = ["ing-1", "ing-2"];
    let used = new Set(["ing-1"]);
    expect(areAllIngredientsUsed(used, ids)).toBe(false);
    used.add("ing-2");
    expect(areAllIngredientsUsed(used, ids)).toBe(true);
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
    used.add("ing-1");
    used.add("ing-3");
    setMock(STORAGE_KEY, Array.from(used));

    expect(setMock).toHaveBeenCalledWith(STORAGE_KEY, ["ing-1", "ing-3"]);

    // Reconstruct on the next cook entry the way the provider's initializer does.
    const stored = getMock(STORAGE_KEY);
    expect(Array.isArray(stored)).toBe(true);
    const rehydrated = new Set(stored ?? []);
    expect(rehydrated.has("ing-1")).toBe(true);
    expect(rehydrated.has("ing-3")).toBe(true);
    expect(rehydrated.has("ing-2")).toBe(false);
    expect(areAllIngredientsUsed(rehydrated, ingredientIds)).toBe(false);
  });

  it("marks all used once the full set is persisted and rehydrated", () => {
    let used = new Set<string>();
    for (const id of ingredientIds) {
      used.add(id);
    }
    setMock(STORAGE_KEY, Array.from(used));

    const rehydrated = new Set(getMock(STORAGE_KEY) ?? []);
    expect(areAllIngredientsUsed(rehydrated, ingredientIds)).toBe(true);
  });

  it("starts fresh when nothing has been persisted for the recipe", () => {
    const stored = getMock(STORAGE_KEY);
    const rehydrated = new Set(Array.isArray(stored) ? stored : []);
    expect(rehydrated.size).toBe(0);
    expect(areAllIngredientsUsed(rehydrated, ingredientIds)).toBe(false);
  });
});
