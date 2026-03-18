import { DatabaseFacade } from "../DatabaseFacade";

jest.mock("../database", () => ({
  database: {
    write: jest.fn((cb) => cb()),
    collections: {
      get: jest.fn(),
    },
  },
}));

jest.mock("expo-constants", () => ({}));
jest.mock("expo-modules-core", () => ({}));

jest.mock("~/lib/supabase/supabase-client", () => ({
  supabase: {},
}));
jest.mock("~/data/supabase-api/RecipeApi", () => ({
  recipeApi: {},
}));

describe("DatabaseFacade Performance", () => {
  let facade: DatabaseFacade;

  beforeEach(() => {
    facade = new DatabaseFacade();
  });

  it("measures clearRecipes performance with and without destroyAllPermanently", async () => {
    const mockQuery = {
      fetch: jest.fn(),
      destroyAllPermanently: jest.fn().mockResolvedValue(undefined),
    };

    // Simulate 10000 records per collection (4 collections)
    const dummyRecords = Array.from({ length: 10000 }).map((_, i) => ({
      id: `record_${i}`,
      destroyPermanently: jest.fn().mockResolvedValue(undefined),
    }));
    mockQuery.fetch.mockResolvedValue(dummyRecords);

    const mockCollection = {
      query: jest.fn(() => mockQuery),
    };

    const { database } = require("../database");
    database.collections.get.mockReturnValue(mockCollection);

    const start = performance.now();
    await facade.clearRecipes();
    const end = performance.now();

    console.log(`clearRecipes took ${end - start} ms (using .destroyAllPermanently())`);

    // Check if fetch was called (which is the slow path)
    expect(end - start).toBeGreaterThanOrEqual(0);
    expect(mockQuery.destroyAllPermanently).toHaveBeenCalledTimes(4); // 4 collections
    expect(mockQuery.fetch).toHaveBeenCalledTimes(0); // Fetch should not be called anymore
  });

  it("measures clearAllData performance with and without destroyAllPermanently", async () => {
    const mockQuery = {
      fetch: jest.fn(),
      destroyAllPermanently: jest.fn().mockResolvedValue(undefined),
    };

    // Simulate 10000 records per collection
    const dummyRecords = Array.from({ length: 10000 }).map((_, i) => ({
      id: `record_${i}`,
      destroyPermanently: jest.fn().mockResolvedValue(undefined),
    }));
    mockQuery.fetch.mockResolvedValue(dummyRecords);

    const mockCollection = {
      query: jest.fn(() => mockQuery),
    };

    const { database } = require("../database");
    database.collections.get.mockReturnValue(mockCollection);

    const start = performance.now();
    await facade.clearAllData();
    const end = performance.now();

    console.log(`clearAllData took ${end - start} ms (using .destroyAllPermanently())`);

    expect(end - start).toBeGreaterThanOrEqual(0);
    expect(mockQuery.destroyAllPermanently).toHaveBeenCalledTimes(6); // 6 collections
    expect(mockQuery.fetch).toHaveBeenCalledTimes(0); // Fetch should not be called anymore
  });
});
