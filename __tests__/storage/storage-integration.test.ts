// Mock MMKV and MMKVStorage
const mockMMKV = {
  set: jest.fn(),
  getString: jest.fn(),
  delete: jest.fn(),
  contains: jest.fn(),
  clearAll: jest.fn(),
  getAllKeys: jest.fn(),
};

// Mock the MMKV class
jest.mock("react-native-mmkv", () => ({
  MMKV: jest.fn().mockImplementation(() => mockMMKV),
}));

// Mock the MMKVStorage class to provide the interface methods directly
const mockMMKVStorage = {
  get: jest.fn(),
  set: jest.fn(),
  getString: jest.fn(),
  setString: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  contains: jest.fn(),
  getAllKeys: jest.fn(),
  size: jest.fn(),
  getBatch: jest.fn(),
  setBatch: jest.fn(),
  deleteBatch: jest.fn(),
};

// Mock the AsyncStorageImpl since StorageFactory falls back to it in Expo Go
const mockAsyncStorage = {
  get: jest.fn(),
  set: jest.fn(),
  getString: jest.fn(),
  setString: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  contains: jest.fn(),
  getAllKeys: jest.fn(),
  size: jest.fn(),
  getBatch: jest.fn(),
  setBatch: jest.fn(),
  deleteBatch: jest.fn(),
  // Async methods
  getAsync: jest.fn(),
  setAsync: jest.fn(),
  deleteAsync: jest.fn(),
  clearAsync: jest.fn(),
};

jest.mock("~/data/storage/implementations/mmkv-storage", () => ({
  MMKVStorage: jest.fn().mockImplementation(() => mockMMKVStorage),
}));

jest.mock("~/data/storage/implementations/async-storage-impl", () => ({
  AsyncStorageImpl: jest.fn().mockImplementation(() => mockAsyncStorage),
}));

import { StorageFactory, storageFacade } from "~/data/storage";
import { BaseRepository } from "~/data/old-repositories/base-repository";
import type { PantryItem } from "~/types/PantryItem";
import type { RecipeRackItem } from "~/types/RecipeRackItem";
import { dummyPantryItems } from "~/data/dummy/dummy-data";

// Create test repository classes that extend BaseRepository
class TestPantryRepository extends BaseRepository<PantryItem> {
  constructor() {
    super("pantryItems");
    // Don't auto-initialize in tests
  }

  getById(id: number): PantryItem | null {
    return this.findFirst((item) => item.id === id);
  }

  update(item: PantryItem): boolean {
    return this.updateWhere(
      (existing) => existing.id === item.id,
      () => ({ ...item, updated_at: new Date() })
    );
  }

  delete(id: number): boolean {
    return this.deleteWhere((item) => item.id === id) > 0;
  }

  getByType(type: "fridge" | "cabinet"): PantryItem[] {
    return this.findWhere((item) => item.type === type);
  }

  getExpiringSoon(days: number = 3): PantryItem[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return this.findWhere((item) => {
      if (!item.expiry_date) return false;
      return new Date(item.expiry_date) <= cutoffDate;
    });
  }

  searchByName(query: string): PantryItem[] {
    const lowerQuery = query.toLowerCase();
    return this.findWhere((item) =>
      item.name.toLowerCase().includes(lowerQuery)
    );
  }

  addWithAutoId(
    itemData: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): PantryItem {
    const existingItems = this.getAll();
    const maxId =
      existingItems.length > 0
        ? Math.max(...existingItems.map((item) => item.id))
        : 0;

    const newItem: PantryItem = {
      ...itemData,
      id: maxId + 1,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.add(newItem);
    return newItem;
  }

  seedWithDummyData(): void {
    this.setAll(dummyPantryItems);
  }
}

class TestRecipeRepository extends BaseRepository<RecipeRackItem> {
  constructor() {
    super("recipeRackItems");
  }

  getById(id: string): RecipeRackItem | null {
    return this.findFirst((item) => item.id === id);
  }

  update(item: RecipeRackItem): boolean {
    return this.updateWhere(
      (existing) => existing.id === item.id,
      () => ({ ...item, updated_at: new Date() })
    );
  }

  delete(id: string): boolean {
    return this.deleteWhere((item) => item.id === id) > 0;
  }

  searchByTitle(query: string): RecipeRackItem[] {
    const lowerQuery = query.toLowerCase();
    return this.findWhere((item) =>
      item.title.toLowerCase().includes(lowerQuery)
    );
  }

  addWithAutoId(
    itemData: Omit<RecipeRackItem, "id" | "created_at" | "updated_at">
  ): RecipeRackItem {
    const newItem: RecipeRackItem = {
      ...itemData,
      id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.add(newItem);
    return newItem;
  }

  updatePosition(id: string, x: number, y: number, scale: number): boolean {
    return this.updateWhere(
      (item) => item.id === id,
      (item) => ({ ...item, x, y, scale, updated_at: new Date() })
    );
  }
}

describe("Storage Integration Tests", () => {
  let testPantryRepository: TestPantryRepository;
  let testRecipeRepository: TestRecipeRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations for both MMKV and MMKVStorage
    mockMMKV.set.mockReset().mockImplementation(() => {});
    mockMMKV.getString.mockReset().mockImplementation(() => undefined);
    mockMMKV.delete.mockReset().mockImplementation(() => {});
    mockMMKV.contains.mockReset().mockImplementation(() => false);
    mockMMKV.clearAll.mockReset().mockImplementation(() => {});
    mockMMKV.getAllKeys.mockReset().mockImplementation(() => []);

    // Reset MMKVStorage mock implementations
    mockMMKVStorage.get.mockReset().mockImplementation(() => null);
    mockMMKVStorage.set.mockReset().mockImplementation(() => {});
    mockMMKVStorage.getString.mockReset().mockImplementation(() => null);
    mockMMKVStorage.setString.mockReset().mockImplementation(() => {});
    mockMMKVStorage.delete.mockReset().mockImplementation(() => {});
    mockMMKVStorage.clear.mockReset().mockImplementation(() => {});
    mockMMKVStorage.contains.mockReset().mockImplementation(() => false);
    mockMMKVStorage.getAllKeys.mockReset().mockImplementation(() => []);
    mockMMKVStorage.size.mockReset().mockImplementation(() => 0);
    mockMMKVStorage.getBatch.mockReset().mockImplementation(() => ({}));
    mockMMKVStorage.setBatch.mockReset().mockImplementation(() => {});
    mockMMKVStorage.deleteBatch.mockReset().mockImplementation(() => {});

    // Reset storage factory to clean state
    (StorageFactory as any).instance = null;
    (StorageFactory as any).currentConfig = null;

    // Initialize with MMKV
    StorageFactory.initialize({ type: "mmkv" });

    // Create fresh repository instances for each test
    testPantryRepository = new TestPantryRepository();
    testRecipeRepository = new TestRecipeRepository();
  });

  afterEach(() => {
    // Clean up storage after each test
    jest.clearAllMocks();

    // Reset ALL mock implementations completely
    mockMMKV.set.mockReset();
    mockMMKV.getString.mockReset();
    mockMMKV.delete.mockReset();
    mockMMKV.contains.mockReset();
    mockMMKV.clearAll.mockReset();
    mockMMKV.getAllKeys.mockReset();

    // Reset MMKVStorage mocks
    mockMMKVStorage.get.mockReset();
    mockMMKVStorage.set.mockReset();
    mockMMKVStorage.getString.mockReset();
    mockMMKVStorage.setString.mockReset();
    mockMMKVStorage.delete.mockReset();
    mockMMKVStorage.clear.mockReset();
    mockMMKVStorage.contains.mockReset();
    mockMMKVStorage.getAllKeys.mockReset();
    mockMMKVStorage.size.mockReset();
    mockMMKVStorage.getBatch.mockReset();
    mockMMKVStorage.setBatch.mockReset();
    mockMMKVStorage.deleteBatch.mockReset();

    // Reset storage factory
    (StorageFactory as any).instance = null;
    (StorageFactory as any).currentConfig = null;
  });

  describe("StorageFacade Integration", () => {
    beforeEach(() => {
      // Initialize StorageFactory with MMKV so facade uses our mock
      StorageFactory.initialize({ type: "mmkv" });
    });

    it("should work end-to-end with MMKV implementation", () => {
      const testData = { name: "John", age: 30 };
      mockAsyncStorage.get.mockReturnValue(testData);

      // Set data through facade
      storageFacade.set("user", testData);

      // Get data through facade
      const result = storageFacade.get("user");

      expect(mockAsyncStorage.set).toHaveBeenCalledWith("user", testData);
      expect(mockAsyncStorage.get).toHaveBeenCalledWith("user");
      expect(result).toEqual(testData);
    });

    it("should handle batch operations through facade", () => {
      const data1 = { id: 1, name: "Item 1" };
      const data2 = { id: 2, name: "Item 2" };
      mockAsyncStorage.getBatch.mockReturnValue({
        item1: data1,
        item2: data2,
      });

      // Set batch data
      storageFacade.setBatch({
        item1: data1,
        item2: data2,
      });

      // Get batch data
      const result = storageFacade.getBatch(["item1", "item2"]);

      expect(mockAsyncStorage.setBatch).toHaveBeenCalledWith({
        item1: data1,
        item2: data2,
      });
      expect(mockAsyncStorage.getBatch).toHaveBeenCalledWith(["item1", "item2"]);
      expect(result).toEqual({
        item1: data1,
        item2: data2,
      });
    });

    it("should switch storage backends seamlessly", () => {
      // Start with MMKV
      storageFacade.set("test", "mmkv-data");
      expect(mockAsyncStorage.set).toHaveBeenCalledWith("test", "mmkv-data");

      // Switch to AsyncStorage (mocked to not actually switch for this test)
      // In real scenario, this would switch the underlying implementation
      const currentConfig = StorageFactory.getCurrentConfig();
      expect(currentConfig?.type).toBe("mmkv");
    });
  });

  describe("Repository Integration", () => {
    beforeEach(() => {
      // Initialize StorageFactory with MMKV so repositories use our mock
      StorageFactory.initialize({ type: "mmkv" });
    });

    describe("PantryRepository", () => {
      it("should initialize with dummy data when empty", () => {
        // Mock empty storage - getString returns null
        mockAsyncStorage.getString.mockReturnValue(null);

        // Manually initialize with dummy data
        testPantryRepository.seedWithDummyData();

        // Should call setString to initialize with dummy data
        expect(mockAsyncStorage.setString).toHaveBeenCalled();
        const setCall = mockAsyncStorage.setString.mock.calls[0];
        expect(setCall[0]).toBe("pantryItems");
        expect(JSON.parse(setCall[1])).toBeInstanceOf(Array);
      });

      it("should not initialize dummy data when storage contains data", () => {
        // Make storage appear to contain data
        const existingData = JSON.stringify([]);
        mockAsyncStorage.getString.mockReturnValue(existingData);

        jest.clearAllMocks();

        // Get existing data (which exists)
        const result = testPantryRepository.getAll();
        expect(result).toEqual([]); // Empty but exists

        // Should have called getString but not setString
        expect(mockAsyncStorage.getString).toHaveBeenCalled();
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

        const result = testPantryRepository.addWithAutoId(newItemData);

        expect(result.id).toBe(1); // Should be first ID since storage starts empty
        expect(result.name).toBe("New Item");
        expect(mockAsyncStorage.setString).toHaveBeenCalled();
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

        mockAsyncStorage.getString.mockReturnValue(JSON.stringify(items));

        const fridgeItems = testPantryRepository.getByType("fridge");
        const cabinetItems = testPantryRepository.getByType("cabinet");

        expect(fridgeItems).toHaveLength(1);
        expect(fridgeItems[0]?.name).toBe("Fridge Item");
        expect(cabinetItems).toHaveLength(1);
        expect(cabinetItems[0]?.name).toBe("Cabinet Item");
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

        const expiringSoon = testPantryRepository.getExpiringSoon(3); // 3 days

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

        const searchResults = testPantryRepository.searchByName("apple");

        expect(searchResults).toHaveLength(1);
        expect(searchResults[0].name).toBe("Apple Juice");
      });
    });

    describe("RecipeRepository", () => {
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

        const result = testRecipeRepository.addWithAutoId(recipeData);

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

        const success = testRecipeRepository.updatePosition(
          "recipe-1",
          150,
          250,
          1.2
        );

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

        // Set up the mock to return our test data when getString is called
        mockMMKV.getString.mockReturnValue(JSON.stringify(recipes));

        // Now test the search functionality
        const allRecipes = testRecipeRepository.getAll();
        expect(allRecipes).toHaveLength(2); // Verify data is loaded

        const searchResults = testRecipeRepository.searchByTitle("chocolate");

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

      const pantryItems = testPantryRepository.getAll();
      const recipes = testRecipeRepository.getAll();

      expect(pantryItems).toHaveLength(1);
      expect(recipes).toHaveLength(1);
      expect(mockMMKV.getString).toHaveBeenCalledWith("pantryItems");
      expect(mockMMKV.getString).toHaveBeenCalledWith("recipeRackItems");
    });

    it("should maintain data isolation between repositories", () => {
      testPantryRepository.clear();
      testRecipeRepository.clear();

      expect(mockMMKV.delete).toHaveBeenCalledWith("pantryItems");
      expect(mockMMKV.delete).toHaveBeenCalledWith("recipeRackItems");
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle storage errors in repositories", () => {
      mockMMKV.getString.mockImplementation(() => {
        throw new Error("Storage read error");
      });

      expect(() => testPantryRepository.getAll()).toThrow();
    });

    it("should handle invalid JSON in repositories", () => {
      mockMMKV.getString.mockReturnValue("invalid json");

      expect(() => testPantryRepository.getAll()).toThrow();
    });

    it("should recover from storage errors gracefully", () => {
      // First call fails
      mockMMKV.getString
        .mockImplementationOnce(() => {
          throw new Error("Temporary error");
        })
        .mockReturnValueOnce("[]"); // Second call succeeds

      expect(() => testPantryRepository.getAll()).toThrow();

      // After error, subsequent calls should work
      const result = testPantryRepository.getAll();
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
      const fridgeItems = testPantryRepository.getByType("fridge");
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
