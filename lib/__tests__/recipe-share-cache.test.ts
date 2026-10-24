import { cacheRecipeShareLink, getCachedRecipeShareLink } from "../recipe-share-cache";
import { storageFacade as storage } from "~/data/storage";
import { buildRecipeShareLink } from "~/utils/recipe-share-link";

const values = new Map<string, unknown>();
jest.mock("~/data/storage", () => ({
  storageFacade: {
    get: jest.fn((key: string) => values.get(key) ?? null),
    set: jest.fn((key: string, value: unknown) => values.set(key, value)),
    delete: jest.fn((key: string) => values.delete(key)),
  },
}));

const token = "430138cb-2b17-42c8-a72b-b67e1c5ac927";
beforeEach(() => {
  jest.clearAllMocks();
  values.clear();
});

it("matches the exact public snapshot and keeps recipes separate", () => {
  cacheRecipeShareLink("pasta", "snapshot", token);
  expect(getCachedRecipeShareLink("pasta", "snapshot")).toBe(buildRecipeShareLink(token));
  expect(getCachedRecipeShareLink("pasta", "edited snapshot")).toBeUndefined();
  expect(getCachedRecipeShareLink("soup", "snapshot")).toBeUndefined();
});

it("ignores corrupt entries and invalid public tokens", () => {
  values.set("recipe_share_link_v1:pasta", { snapshot: "snapshot", token: "not-a-token" });
  expect(getCachedRecipeShareLink("pasta", "snapshot")).toBeUndefined();
  values.set("recipe_share_link_v1:pasta", "bad entry");
  expect(getCachedRecipeShareLink("pasta", "snapshot")).toBeUndefined();
  cacheRecipeShareLink("soup", "snapshot", "not-a-token");
  expect(getCachedRecipeShareLink("soup", "snapshot")).toBeUndefined();
});

it("bounds persistence and evicts older recipes", () => {
  for (let index = 0; index < 50; index++) {
    cacheRecipeShareLink(`recipe-${index}`, "snapshot", token);
  }
  // Updating an existing recipe must not consume a second cache slot.
  cacheRecipeShareLink("recipe-0", "edited snapshot", token);
  cacheRecipeShareLink("recipe-50", "snapshot", token);
  expect(values.size).toBe(51); // Fifty entries plus their small index.
  expect(getCachedRecipeShareLink("recipe-1", "snapshot")).toBeUndefined();
  expect(getCachedRecipeShareLink("recipe-0", "edited snapshot")).toBe(buildRecipeShareLink(token));
  expect(getCachedRecipeShareLink("recipe-50", "snapshot")).toBe(buildRecipeShareLink(token));
});

it("treats storage failures as cache misses instead of blocking sharing", () => {
  jest.mocked(storage.get).mockImplementationOnce(() => {
    throw new Error("Storage unavailable");
  });
  expect(getCachedRecipeShareLink("pasta", "snapshot")).toBeUndefined();
  jest.mocked(storage.set).mockImplementationOnce(() => {
    throw new Error("Storage full");
  });
  expect(() => cacheRecipeShareLink("pasta", "snapshot", token)).not.toThrow();
});
