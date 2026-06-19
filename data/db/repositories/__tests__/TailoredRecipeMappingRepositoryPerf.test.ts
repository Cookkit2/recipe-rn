/// <reference types="jest" />

import { TailoredRecipeMappingRepository } from "../TailoredRecipeMappingRepository";
import { database } from "../../database";
import { Q } from "@nozbe/watermelondb";

jest.mock("../../database", () => ({
  database: {
    collections: {
      get: jest.fn(),
    },
    write: jest.fn((cb: any) => cb()),
    batch: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("TailoredRecipeMappingRepository - Performance", () => {
  let repository: TailoredRecipeMappingRepository;
  let mockMappingCollection: any;
  let mockRecipeCollection: any;
  let mockStepsCollection: any;
  let mockIngredientsCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMappingCollection = {
      query: jest.fn().mockReturnThis(),
      fetch: jest.fn(),
    };

    mockRecipeCollection = {
      query: jest.fn().mockReturnThis(),
      fetch: jest.fn(),
    };

    mockStepsCollection = {
      query: jest.fn().mockReturnThis(),
      fetch: jest.fn(),
    };

    mockIngredientsCollection = {
      query: jest.fn().mockReturnThis(),
      fetch: jest.fn(),
    };

    (database.collections.get as jest.Mock).mockImplementation((table: string) => {
      switch (table) {
        case "tailored_recipe_mapping":
          return mockMappingCollection;
        case "recipe":
          return mockRecipeCollection;
        case "recipe_step":
          return mockStepsCollection;
        case "recipe_ingredient":
          return mockIngredientsCollection;
        default:
          return null;
      }
    });

    repository = new TailoredRecipeMappingRepository();
  });

  it("should measure performance of findByBaseAndHash with many mappings", async () => {
    const NUM_MAPPINGS = 20000;

    // Generate test data
    const mappings = Array.from({ length: NUM_MAPPINGS }).map((_, i) => ({
      recipeId: `r${i}`,
      hash: "some_hash",
    }));

    const recipes = Array.from({ length: NUM_MAPPINGS }).map((_, i) => ({
      id: `r${i}`,
      type: "tailored",
      sourceUrl: "base_123",
    }));

    mockMappingCollection.fetch.mockResolvedValueOnce(mappings);
    mockRecipeCollection.fetch.mockResolvedValueOnce(recipes);

    mockStepsCollection.fetch.mockResolvedValue([]);
    mockIngredientsCollection.fetch.mockResolvedValue([]);

    const start = performance.now();

    const result = await repository.findByBaseAndHash("base_123", "some_hash");

    const end = performance.now();
    const duration = end - start;

    console.log(`Execution time for ${NUM_MAPPINGS} mappings: ${duration}ms`);

    expect(result).not.toBeNull();
  });
});
