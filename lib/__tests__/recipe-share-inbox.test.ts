import { storage } from "~/data";
import {
  clearPendingRecipeShare,
  readPendingRecipeShare,
  savePendingRecipeShare,
} from "../recipe-share-inbox";
jest.mock("~/data", () => {
  const values = new Map<string, string>();
  return {
    storage: {
      get: jest.fn((key: string) => values.get(key)),
      set: jest.fn((key: string, value: string) => values.set(key, value)),
      delete: jest.fn((key: string) => values.delete(key)),
    },
  };
});
it("persists a share for import after onboarding or a later launch", () => {
  const pending = savePendingRecipeShare({
    url: "https://www.instagram.com/p/abc/",
    text: "2 eggs. Whisk and fry.",
  });
  expect(readPendingRecipeShare()).toEqual(pending);
});
it("does not clear a newer share when an earlier import completes", () => {
  const old = savePendingRecipeShare({ text: "Old recipe" });
  const next = savePendingRecipeShare({ text: "New recipe" });
  clearPendingRecipeShare(old.id);
  expect(readPendingRecipeShare()).toEqual(next);
  clearPendingRecipeShare(next.id);
  expect(readPendingRecipeShare()).toBeNull();
});
it("ignores invalid stored data instead of blocking app startup", () => {
  (storage.get as jest.Mock).mockReturnValueOnce("invalid json");
  expect(readPendingRecipeShare()).toBeNull();
});
