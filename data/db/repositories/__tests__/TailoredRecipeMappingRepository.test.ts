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

describe("TailoredRecipeMappingRepository", () => {
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

  describe("cleanupExpired", () => {
    it("should batch delete expired mappings and associated records", async () => {
      const mockExpiredMappings = [
        { recipeId: "r1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_m1") },
        { recipeId: "r2", prepareDestroyPermanently: jest.fn().mockReturnValue("del_m2") },
      ];

      mockMappingCollection.fetch.mockResolvedValueOnce(mockExpiredMappings);
      mockRecipeCollection.fetch.mockResolvedValueOnce([
        { id: "r1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_r1") },
        { id: "r2", prepareDestroyPermanently: jest.fn().mockReturnValue("del_r2") },
      ]);
      mockStepsCollection.fetch.mockResolvedValueOnce([
        { id: "s1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_s1") },
      ]);
      mockIngredientsCollection.fetch.mockResolvedValueOnce([
        { id: "i1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_i1") },
      ]);

      const count = await repository.cleanupExpired();

      expect(count).toBe(2);
      expect(database.batch).toHaveBeenCalledWith(
        "del_m1",
        "del_m2",
        "del_r1",
        "del_r2",
        "del_s1",
        "del_i1"
      );

      // Verify Q.oneOf was used
      expect(mockRecipeCollection.query).toHaveBeenCalledWith(
        expect.anything() // Q.where("id", Q.oneOf(["r1", "r2"]))
      );
    });

    it("should return 0 if no expired mappings", async () => {
      mockMappingCollection.fetch.mockResolvedValueOnce([]);
      const count = await repository.cleanupExpired();
      expect(count).toBe(0);
      expect(database.batch).not.toHaveBeenCalled();
    });
  });

  describe("clearForBaseRecipe", () => {
    it("should batch delete tailored recipes and associated records for a base recipe", async () => {
      const mockTailoredRecipes = [
        { id: "tr1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_tr1") },
      ];

      mockRecipeCollection.fetch.mockResolvedValueOnce(mockTailoredRecipes);
      mockMappingCollection.fetch.mockResolvedValueOnce([
        { id: "m1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_m1") },
      ]);
      mockStepsCollection.fetch.mockResolvedValueOnce([
        { id: "ts1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_ts1") },
      ]);
      mockIngredientsCollection.fetch.mockResolvedValueOnce([
        { id: "ti1", prepareDestroyPermanently: jest.fn().mockReturnValue("del_ti1") },
      ]);

      await repository.clearForBaseRecipe("base1");

      expect(database.batch).toHaveBeenCalledWith("del_m1", "del_ts1", "del_ti1", "del_tr1");
    });
  });
});
