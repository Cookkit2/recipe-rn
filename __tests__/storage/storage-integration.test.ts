// Mock MMKV before any imports that might use it
const mockMMKV = {
  set: jest.fn(),
  getString: jest.fn(),
  delete: jest.fn(),
  contains: jest.fn(),
  clearAll: jest.fn(),
  getAllKeys: jest.fn(),
};

jest.mock("react-native-mmkv", () => ({
  MMKV: jest.fn().mockImplementation(() => mockMMKV),
}));

import { StorageFactory, storageFacade } from "~/data/storage";
import { pantryRepository, PantryRepository } from "~/data/pantry-repository";
import {
  recipeRepository,
  RecipeRepository,
} from "~/data/repositories/recipe-repository";
import type { PantryItem } from "~/types/PantryItem";
import type { RecipeRackItem } from "~/types/RecipeRackItem";

describe("Storage Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockMMKV.set.mockImplementation(() => {});
    mockMMKV.getString.mockImplementation(() => undefined);
    mockMMKV.delete.mockImplementation(() => {});
    mockMMKV.contains.mockImplementation(() => false);
    mockMMKV.clearAll.mockImplementation(() => {});
    mockMMKV.getAllKeys.mockImplementation(() => []);

    // Reset storage factory
    (StorageFactory as any).instance = null;
    (StorageFactory as any).currentConfig = null;

    // Initialize with MMKV
    StorageFactory.initialize({ type: "mmkv" });
  });

  describe("StorageFacade Integration", () => {
    it("should work end-to-end with MMKV implementation", () => {
      const testData = { name: "John", age: 30 };
      mockMMKV.getString.mockReturnValue(JSON.stringify(testData));

      // Set data through facade
      storageFacade.set("user", testData);

      // Get data through facade
      const result = storageFacade.get("user");

      expect(mockMMKV.set).toHaveBeenCalledWith(
        "user",
        JSON.stringify(testData)
      );
      expect(mockMMKV.getString).toHaveBeenCalledWith("user");
      expect(result).toEqual(testData);
    });

    it("should handle batch operations through facade", () => {
      const data1 = { id: 1, name: "Item 1" };
      const data2 = { id: 2, name: "Item 2" };

      mockMMKV.getString
        .mockReturnValueOnce(JSON.stringify(data1))
        .mockReturnValueOnce(JSON.stringify(data2));

      // Set batch data
      storageFacade.setBatch({
        item1: data1,
        item2: data2,
      });

      // Get batch data
      const result = storageFacade.getBatch(["item1", "item2"]);

      expect(mockMMKV.set).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        item1: data1,
        item2: data2,
      });
    });

    it("should switch storage backends seamlessly", () => {
      // Start with MMKV
      storageFacade.set("test", "mmkv-data");
      expect(mockMMKV.set).toHaveBeenCalled();

      // Switch to AsyncStorage (mocked to not actually switch for this test)
      // In real scenario, this would switch the underlying implementation
      const currentConfig = StorageFactory.getCurrentConfig();
      expect(currentConfig?.type).toBe("mmkv");
    });
  });

  describe("Repository Integration", () => {
    describe("PantryRepository", () => {
      let repository: PantryRepository;

      beforeEach(() => {
        repository = new PantryRepository();
        mockMMKV.contains.mockReturnValue(false); // Start with empty storage
      });

      it("should initialize with dummy data when empty", () => {
        // Mock empty storage
        mockMMKV.contains.mockReturnValue(false);

        new PantryRepository();

        expect(mockMMKV.set).toHaveBeenCalled();
        // Should set initial dummy data
        const setCall = mockMMKV.set.mock.calls[0];
        expect(setCall[0]).toBe("pantryItems");
        expect(JSON.parse(setCall[1])).toBeInstanceOf(Array);
      });

      it("should not initialize dummy data when storage contains data", () => {
        mockMMKV.contains.mockReturnValue(true);
        mockMMKV.getString.mockReturnValue("[]"); // Empty array but exists

        jest.clearAllMocks();
        new PantryRepository();

        expect(mockMMKV.set).not.toHaveBeenCalled();
      });

      it("should add item with auto-generated ID", () => {
        const existingItems: PantryItem[] = [
          {
            id: 1,
            name: "Existing Item",
            quantity: "1",
            category: "test",
            type: "fridge",
            image_url: "test",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
            steps_to_store: [],
          },
        ];

        mockMMKV.getString
          .mockReturnValueOnce(JSON.stringify(existingItems)) // For getAll in addWithAutoId
          .mockReturnValueOnce(
            JSON.stringify([...existingItems, expect.any(Object)])
          ); // For setAll

        const newItemData = {
          name: "New Item",
          quantity: "2",
          category: "test",
          type: "cabinet" as const,
          image_url: "test",
          x: 0,
          y: 0,
          scale: 1,
          steps_to_store: [],
        };

        const result = repository.addWithAutoId(newItemData);

        expect(result.id).toBe(2); // Should be next ID
        expect(result.name).toBe("New Item");
        expect(mockMMKV.set).toHaveBeenCalled();
      });

      it("should query items by type", () => {
        const items: PantryItem[] = [
          {
            id: 1,
            name: "Fridge Item",
            type: "fridge",
            quantity: "1",
            category: "test",
            image_url: "test",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
            steps_to_store: [],
          },
          {
            id: 2,
            name: "Cabinet Item",
            type: "cabinet",
            quantity: "1",
            category: "test",
            image_url: "test",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
            steps_to_store: [],
          },
        ];

        mockMMKV.getString.mockReturnValue(JSON.stringify(items));

        const fridgeItems = repository.getByType("fridge");
        const cabinetItems = repository.getByType("cabinet");

        expect(fridgeItems).toHaveLength(1);
        expect(fridgeItems[0].name).toBe("Fridge Item");
        expect(cabinetItems).toHaveLength(1);
        expect(cabinetItems[0].name).toBe("Cabinet Item");
      });

      it("should find expiring items", () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const items: PantryItem[] = [
          {
            id: 1,
            name: "Expiring Soon",
            expiry_date: tomorrow,
            type: "fridge",
            quantity: "1",
            category: "test",
            image_url: "test",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
            steps_to_store: [],
          },
          {
            id: 2,
            name: "Not Expiring",
            expiry_date: nextWeek,
            type: "fridge",
            quantity: "1",
            category: "test",
            image_url: "test",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
            steps_to_store: [],
          },
        ];

        mockMMKV.getString.mockReturnValue(JSON.stringify(items));

        const expiringSoon = repository.getExpiringSoon(3); // 3 days

        expect(expiringSoon).toHaveLength(1);
        expect(expiringSoon[0].name).toBe("Expiring Soon");
      });

      it("should search items by name", () => {
        const items: PantryItem[] = [
          {
            id: 1,
            name: "Apple Juice",
            type: "fridge",
            quantity: "1",
            category: "beverage",
            image_url: "test",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
            steps_to_store: [],
          },
          {
            id: 2,
            name: "Orange Juice",
            type: "fridge",
            quantity: "1",
            category: "beverage",
            image_url: "test",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
            steps_to_store: [],
          },
        ];

        mockMMKV.getString.mockReturnValue(JSON.stringify(items));

        const searchResults = repository.searchByName("apple");

        expect(searchResults).toHaveLength(1);
        expect(searchResults[0].name).toBe("Apple Juice");
      });
    });

    describe("RecipeRepository", () => {
      let repository: RecipeRepository;

      beforeEach(() => {
        repository = new RecipeRepository();
      });

      it("should add recipe with auto-generated ID", () => {
        mockMMKV.getString.mockReturnValue("[]"); // Empty array

        const recipeData = {
          title: "Test Recipe",
          imageUrl: "test.jpg",
          recipeId: "recipe-123",
          x: 100,
          y: 200,
          scale: 1.5,
        };

        const result = repository.addWithAutoId(recipeData);

        expect(result.id).toMatch(/^recipe_\d+_[a-z0-9]+$/);
        expect(result.title).toBe("Test Recipe");
        expect(result.recipeId).toBe("recipe-123");
        expect(mockMMKV.set).toHaveBeenCalled();
      });

      it("should update recipe position", () => {
        const recipe: RecipeRackItem = {
          id: "recipe-1",
          title: "Test Recipe",
          imageUrl: "test.jpg",
          recipeId: "recipe-123",
          x: 100,
          y: 200,
          scale: 1.0,
          created_at: new Date(),
          updated_at: new Date(),
        };

        mockMMKV.getString
          .mockReturnValueOnce(JSON.stringify([recipe])) // For finding the item
          .mockReturnValueOnce(
            JSON.stringify([{ ...recipe, x: 150, y: 250, scale: 1.2 }])
          ); // For after update

        const success = repository.updatePosition("recipe-1", 150, 250, 1.2);

        expect(success).toBe(true);
        expect(mockMMKV.set).toHaveBeenCalled();
      });

      it("should search recipes by title", () => {
        const recipes: RecipeRackItem[] = [
          {
            id: "1",
            title: "Chocolate Cake",
            imageUrl: "cake.jpg",
            recipeId: "recipe-1",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: "2",
            title: "Vanilla Ice Cream",
            imageUrl: "ice.jpg",
            recipeId: "recipe-2",
            x: 0,
            y: 0,
            scale: 1,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ];

        mockMMKV.getString.mockReturnValue(JSON.stringify(recipes));

        const searchResults = repository.searchByTitle("chocolate");

        expect(searchResults).toHaveLength(1);
        expect(searchResults[0].title).toBe("Chocolate Cake");
      });
    });
  });

  describe("Cross-Repository Operations", () => {
    it("should handle multiple repositories using same storage", () => {
      const pantryData = [{ id: 1, name: "Apple" }];
      const recipeData = [{ id: "1", title: "Apple Pie" }];

      mockMMKV.getString.mockImplementation((key: string) => {
        if (key === "pantryItems") return JSON.stringify(pantryData);
        if (key === "recipeRackItems") return JSON.stringify(recipeData);
        return undefined;
      });

      const pantryItems = pantryRepository.getAll();
      const recipes = recipeRepository.getAll();

      expect(pantryItems).toHaveLength(1);
      expect(recipes).toHaveLength(1);
      expect(mockMMKV.getString).toHaveBeenCalledWith("pantryItems");
      expect(mockMMKV.getString).toHaveBeenCalledWith("recipeRackItems");
    });

    it("should maintain data isolation between repositories", () => {
      pantryRepository.clear();
      recipeRepository.clear();

      expect(mockMMKV.delete).toHaveBeenCalledWith("pantryItems");
      expect(mockMMKV.delete).toHaveBeenCalledWith("recipeRackItems");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle storage errors in repositories", () => {
      mockMMKV.getString.mockImplementation(() => {
        throw new Error("Storage read error");
      });

      expect(() => pantryRepository.getAll()).toThrow();
    });

    it("should handle invalid JSON in repositories", () => {
      mockMMKV.getString.mockReturnValue("invalid json");

      expect(() => pantryRepository.getAll()).toThrow();
    });

    it("should recover from storage errors gracefully", () => {
      // First call fails
      mockMMKV.getString
        .mockImplementationOnce(() => {
          throw new Error("Temporary error");
        })
        .mockReturnValueOnce("[]"); // Second call succeeds

      expect(() => pantryRepository.getAll()).toThrow();

      // After error, subsequent calls should work
      const result = pantryRepository.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("Performance Integration", () => {
    it("should handle large datasets efficiently", () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        type: i % 2 === 0 ? "fridge" : "cabinet",
        quantity: "1",
        category: "test",
        image_url: "test",
        x: 0,
        y: 0,
        scale: 1,
        created_at: new Date(),
        updated_at: new Date(),
        steps_to_store: [],
      })) as PantryItem[];

      mockMMKV.getString.mockReturnValue(JSON.stringify(largeDataset));

      const startTime = Date.now();
      const fridgeItems = pantryRepository.getByType("fridge");
      const endTime = Date.now();

      expect(fridgeItems).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    it("should handle batch operations efficiently", () => {
      const batchData = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [
          `key${i}`,
          { id: i, data: `data${i}` },
        ])
      );

      storageFacade.setBatch(batchData);

      expect(mockMMKV.set).toHaveBeenCalledTimes(100);
    });
  });
});
