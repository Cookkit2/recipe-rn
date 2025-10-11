import { database } from "./database";
import { Q } from "@nozbe/watermelondb";
import type { Recipe, Stock, CookingHistory } from "./models";
import {
  initializeRepositories,
  RecipeRepository,
  StockRepository,
  CookingHistoryRepository,
} from "./repositories";
import type { RecipeSearchOptions } from "./repositories/RecipeRepository";
import type { StockSearchOptions } from "./repositories/StockRepository";
import {
  convertToUnitSystem,
  roundToReasonablePrecision,
} from "~/utils/unit-converter";

// Public interfaces for database operations
export interface CreateStockData {
  name: string;
  quantity: number;
  unit: string;
  expirationDate?: number;
  purchaseDate?: number;
  notes?: string;
  storageType?: string;
  imageUrl?: string;
  backgroundColor?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export interface UpdateStockData {
  name?: string;
  quantity?: number;
  unit?: string;
  expirationDate?: number;
  purchaseDate?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface CreateRecipeData {
  title: string;
  description: string;
  imageUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  sourceUrl?: string;
  calories?: number;
  tags?: string[];
  steps?: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

export interface RecordCookingData {
  rating?: number;
  notes?: string;
  photoUrl?: string;
}

export interface DatabaseStats {
  recipes: number;
  stockItems: number;
  cookingHistory: number;
  totalRecords: number;
}

export interface ShoppingListResult {
  missingIngredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  availableIngredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    stockQuantity: number;
    stockUnit: string;
  }>;
}

export interface AvailableRecipesResult {
  canMake: Recipe[];
  partiallyCanMake: Array<{
    recipe: Recipe;
    completionPercentage: number;
  }>;
}

export interface RecipeWithDetails {
  recipe: Recipe;
  steps: Array<{
    id: string;
    step: number;
    title: string;
    description: string;
  }>;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}

/**
 * Database Facade - Main interface for all structured database operations
 * This provides a unified, simplified API for accessing all database functionality.
 *
 * IMPORTANT: Only methods exposed here should be used throughout the app.
 * Direct repository access is private and should not be used externally.
 */
export class DatabaseFacade {
  // Private repository instances - not to be accessed directly
  private recipes: RecipeRepository;
  private stocks: StockRepository;
  private cookingHistory: CookingHistoryRepository;

  constructor() {
    // Initialize repositories synchronously first
    const repositories = initializeRepositories();
    this.recipes = repositories.recipeRepository!;
    this.stocks = repositories.stockRepository!;
    this.cookingHistory = repositories.cookingHistoryRepository!;

    // Then initialize async features in the background
    this.initializeAsync();
  }

  private async initializeAsync() {
    try {
      await this.recipes.initialize();
    } catch (error) {
      // Log error to aid debugging, but prevent app crashes
      console.error("DatabaseFacade initialization failed:", error);
    }
  }

  // ============================================
  // RECIPE METHODS
  // ============================================

  /**
   * Get all recipes from the local database
   */
  async getAllRecipes(): Promise<Recipe[]> {
    return await this.recipes.findAll();
  }

  /**
   * Get a single recipe by ID
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    return await this.recipes.findById(id);
  }

  /**
   * Get recipe with all related data (steps and ingredients)
   */
  async getRecipeWithDetails(id: string): Promise<RecipeWithDetails | null> {
    const result = await this.recipes.getRecipeWithDetails(id);
    if (!result) return null;

    return {
      recipe: result.recipe,
      steps: result.steps.map((step) => ({
        id: step.id,
        step: step.step,
        title: step.title,
        description: step.description,
      })),
      ingredients: result.ingredients.map((ingredient: any) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
      })),
    };
  }

  /**
   * Search recipes with filters
   */
  async searchRecipes(
    searchTerm?: string,
    options?: RecipeSearchOptions
  ): Promise<Recipe[]> {
    return await this.recipes.searchRecipes({
      searchTerm,
      ...options,
    });
  }

  /**
   * Create a new recipe with steps and ingredients
   */
  async createRecipe(data: CreateRecipeData): Promise<Recipe> {
    return await this.recipes.createRecipeWithDetails({
      recipe: {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        prepMinutes: data.prepMinutes,
        cookMinutes: data.cookMinutes,
        difficultyStars: data.difficultyStars,
        servings: data.servings,
        sourceUrl: data.sourceUrl,
        calories: data.calories,
        tags: data.tags || [],
      },
      steps: data.steps?.map((step) => ({
        step: step.step,
        title: step.title,
        description: step.description,
        recipeId: "", // Will be set by the repository
      })),
      ingredients: data.ingredients?.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        recipeId: "", // Will be set by the repository
      })),
    });
  }

  /**
   * Delete a recipe and all its related data
   */
  async deleteRecipe(id: string): Promise<void> {
    await this.recipes.delete(id);
  }

  /**
   * Toggle recipe favorite status
   */
  async toggleFavorite(recipeId: string): Promise<Recipe | null> {
    return await this.recipes.toggleFavorite(recipeId);
  }

  /**
   * Get all favorite recipes
   */
  async getFavoriteRecipes(): Promise<Recipe[]> {
    return await this.recipes.getFavoriteRecipes();
  }

  // ============================================
  // STOCK (PANTRY) METHODS
  // ============================================

  /**
   * Get all stock items from pantry
   */
  async getAllStock(): Promise<Stock[]> {
    return await this.stocks.findAll();
  }

  /**
   * Get total count of stock items
   */
  async getStockCount(): Promise<number> {
    return await this.stocks.count();
  }

  /**
   * Get a single stock item by ID
   */
  async getStockById(id: string): Promise<Stock | null> {
    return await this.stocks.findById(id);
  }

  /**
   * Get stock items by name or synonym
   * Updated to use new synonym matching
   */
  async getStockByIngredient(ingredientName: string): Promise<Stock[]> {
    return await this.stocks.findByNameOrSynonym(ingredientName);
  }

  /**
   * Create a new stock item
   */
  async createStock(data: CreateStockData): Promise<Stock> {
    // Map CreateStockData to StockData interface
    const stockData: Record<string, unknown> = {
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      storageType: data.storageType,
      imageUrl: data.imageUrl,
      backgroundColor: data.backgroundColor,
      x: data.x,
      y: data.y,
      scale: data.scale,
    };

    // Convert timestamp to Date if provided
    if (data.expirationDate !== undefined) {
      stockData.expiryDate = new Date(data.expirationDate);
    }

    return await this.stocks.create(stockData);
  }

  /**
   * Update an existing stock item
   */
  async updateStock(id: string, data: UpdateStockData): Promise<Stock | null> {
    // Cast to Record<string, unknown> to satisfy repository interface
    return await this.stocks.update(id, data);
  }

  /**
   * Delete a stock item
   */
  async deleteStock(id: string): Promise<void> {
    await this.stocks.delete(id);
  }

  /**
   * Search stock items
   */
  async searchStock(
    searchTerm?: string,
    options?: StockSearchOptions
  ): Promise<Stock[]> {
    return await this.stocks.searchStock({
      searchTerm,
      ...options,
    });
  }

  /**
   * Convert all stock units to a specific unit system
   */
  async convertUnits(toUnitSystem: "si" | "imperial"): Promise<void> {
    try {
      const allStockItems = await this.stocks.findAll();
      console.log(`📦 Found ${allStockItems.length} stock items to convert`);

      if (allStockItems.length === 0) {
        console.log("ℹ️ No stock items to convert");
        return;
      }

      let convertedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const stockItem of allStockItems) {
        try {
          const converted = convertToUnitSystem(
            stockItem.quantity,
            stockItem.unit,
            toUnitSystem
          );

          const quantityChanged =
            Math.abs(converted.quantity - stockItem.quantity) > 0.001;
          const unitChanged = converted.unit !== stockItem.unit;

          if (quantityChanged || unitChanged) {
            await this.stocks.update(stockItem.id, {
              quantity: roundToReasonablePrecision(converted.quantity),
              unit: converted.unit,
            });
            convertedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to convert stock item ${stockItem.name}:`,
            error
          );
          errorCount++;
        }
      }

      console.log(
        `✅ Conversion: ${convertedCount} converted, ${skippedCount} skipped, ${errorCount} errors`
      );
    } catch (error) {
      console.error(`❌ Error during unit conversion:`, error);
    }
  }

  // ============================================
  // COOKING HISTORY METHODS
  // ============================================

  /**
   * Record that a recipe was cooked
   */
  async recordCooking(
    recipeId: string,
    data?: RecordCookingData
  ): Promise<CookingHistory> {
    return await this.cookingHistory.recordCooking(recipeId, data);
  }

  /**
   * Get cooking history (most recent first)
   */
  async getCookingHistory(limit?: number): Promise<CookingHistory[]> {
    return await this.cookingHistory.getCookingHistory({ limit });
  }

  /**
   * Get recently cooked recipes
   */
  async getRecentlyCookedRecipes(
    limit?: number
  ): Promise<
    Array<{ recipeId: string; lastCookedAt: number; cookCount: number }>
  > {
    return await this.cookingHistory.getRecentlyCookedRecipes(limit);
  }

  /**
   * Get most frequently cooked recipes
   */
  async getMostCookedRecipes(
    limit?: number
  ): Promise<
    Array<{ recipeId: string; cookCount: number; lastCookedAt: number }>
  > {
    return await this.cookingHistory.getMostCookedRecipes(limit);
  }

  /**
   * Get cook count for a specific recipe
   */
  async getRecipeCookCount(recipeId: string): Promise<number> {
    return await this.cookingHistory.getRecipeCookCount(recipeId);
  }

  /**
   * Update a cooking record
   */
  async updateCookingRecord(
    id: string,
    data: RecordCookingData
  ): Promise<CookingHistory | null> {
    return await this.cookingHistory.updateCookingRecord(id, data);
  }

  /**
   * Delete a cooking record
   */
  async deleteCookingRecord(id: string): Promise<void> {
    await this.cookingHistory.delete(id);
  }

  // ============================================
  // HIGH-LEVEL UTILITY METHODS
  // ============================================

  /**
   * Get recipes that can be made with current stock
   * Now includes synonym and category matching for better ingredient detection
   */
  async getAvailableRecipes(): Promise<AvailableRecipesResult> {
    try {
      const allStock = await this.stocks.findAll();

      // console.log("🔍 [getAvailableRecipes] Starting...");
      // console.log(`📦 Total stock items: ${allStock.length}`);
      // console.log(
      //   `📦 Stock items with quantity > 0: ${
      //     allStock.filter((s) => s.quantity > 0).length
      //   }`
      // );

      // Build a comprehensive set of available ingredient names
      // Including stock names, synonyms, and normalized variants
      const availableIngredientNames = new Set(
        allStock
          .filter((stock) => stock.quantity > 0)
          .map((stock) => stock.name.toLowerCase().trim())
      );

      // console.log(
      //   "📝 Available ingredient names:",
      //   Array.from(availableIngredientNames)
      // );

      // Also fetch synonyms and categories for better matching
      const stockSynonyms = new Map<string, string[]>(); // stockName -> synonyms
      const stockCategories = new Map<string, string[]>(); // stockName -> categories

      // Populate synonym and category maps
      for (const stock of allStock) {
        if (stock.quantity <= 0) continue;

        const stockName = stock.name.toLowerCase().trim();

        // Fetch synonyms for this stock item
        const synonymRecords = await database
          .get("ingredient_synonym")
          .query(Q.where("stock_id", Q.eq(stock.id)))
          .fetch();

        const synonyms = synonymRecords.map((syn) => {
          const record = syn as unknown as { synonym: string };
          return record.synonym.toLowerCase().trim();
        });
        if (synonyms.length > 0) {
          // console.log(`🔗 Synonyms for "${stockName}":`, synonyms);
          stockSynonyms.set(stockName, synonyms);
          // Add synonyms to available names too
          synonyms.forEach((syn: string) => availableIngredientNames.add(syn));
        }

        // Fetch categories for this stock item
        const categoryLinks = await database
          .get("stock_category")
          .query(Q.where("stock_id", Q.eq(stock.id)))
          .fetch();

        const categoryIds = categoryLinks.map((link) => {
          const record = link as unknown as { categoryId: string };
          return record.categoryId;
        });
        if (categoryIds.length > 0) {
          const categories = await database
            .get("ingredient_category")
            .query(Q.where("id", Q.oneOf(categoryIds)))
            .fetch();

          const categoryNames = categories.map((cat) => {
            const record = cat as unknown as { name: string };
            return record.name.toLowerCase().trim();
          });
          // console.log(`📁 Categories for "${stockName}":`, categoryNames);
          stockCategories.set(stockName, categoryNames);
        }
      }

      const allRecipes = await this.recipes.findAll();
      // console.log(`📚 Total recipes to check: ${allRecipes.length}`);

      const canMake: Recipe[] = [];
      const partiallyCanMake: {
        recipe: Recipe;
        completionPercentage: number;
      }[] = [];

      // Helper function to check if an ingredient is available
      const isIngredientAvailable = (ingredientName: string): boolean => {
        const normalizeIngredientName = (name: string) => {
          return name
            .toLowerCase()
            .trim()
            .replace(/s$/, "")
            .replace(/es$/, "")
            .replace(/ies$/, "y");
        };

        const normalizedRecipeName = normalizeIngredientName(ingredientName);
        const lowerIngredientName = ingredientName.toLowerCase().trim();

        // 1. Try exact name match
        if (availableIngredientNames.has(lowerIngredientName)) {
          return true;
        }

        // 2. Try normalized name matching
        const foundByName = Array.from(availableIngredientNames).some(
          (stockName) => {
            const normalizedStockName = normalizeIngredientName(stockName);
            return (
              normalizedStockName === normalizedRecipeName ||
              normalizedStockName.includes(normalizedRecipeName) ||
              normalizedRecipeName.includes(normalizedStockName)
            );
          }
        );

        if (foundByName) {
          return true;
        }

        // 3. Try synonym matching
        for (const [, synonyms] of stockSynonyms.entries()) {
          // Check if ingredient matches any synonym
          if (
            synonyms.some(
              (syn) =>
                syn === lowerIngredientName ||
                normalizeIngredientName(syn) === normalizedRecipeName
            )
          ) {
            return true;
          }
        }

        // 4. Try category matching (less strict, for generic ingredients)
        for (const [, categories] of stockCategories.entries()) {
          if (
            categories.some(
              (cat) =>
                cat === lowerIngredientName ||
                normalizeIngredientName(cat) === normalizedRecipeName
            )
          ) {
            return true;
          }
        }

        return false;
      };

      // Process recipes in batches
      const batchSize = 10;

      for (let i = 0; i < allRecipes.length; i += batchSize) {
        const recipeBatch = allRecipes.slice(i, i + batchSize);

        const batchDetailsPromises = recipeBatch.map((recipe) =>
          this.recipes.getRecipeWithDetails(recipe.id)
        );

        const batchDetails = await Promise.all(batchDetailsPromises);

        for (let j = 0; j < recipeBatch.length; j++) {
          const recipe = recipeBatch[j];
          const recipeDetails = batchDetails[j];

          if (!recipeDetails || !recipeDetails.ingredients.length) {
            continue;
          }

          let availableCount = 0;
          for (const ingredient of recipeDetails.ingredients) {
            if (isIngredientAvailable(ingredient.name)) {
              availableCount++;
            }
          }

          const totalCount = recipeDetails.ingredients.length;
          const percentage = Math.round((availableCount / totalCount) * 100);

          if (availableCount === totalCount && totalCount > 0 && recipe) {
            canMake.push(recipe);
          } else if (availableCount > 0 && recipe) {
            partiallyCanMake.push({
              recipe,
              completionPercentage: percentage,
            });
          }
        }
      }

      return {
        canMake,
        partiallyCanMake: partiallyCanMake.sort(
          (a, b) => b.completionPercentage - a.completionPercentage
        ),
      };
    } catch (error) {
      console.error("❌ Error in getAvailableRecipes:", error);
      return { canMake: [], partiallyCanMake: [] };
    }
  }

  /**
   * Get shopping list for a recipe
   */
  async getShoppingListForRecipe(
    recipeId: string
  ): Promise<ShoppingListResult> {
    const recipeDetails = await this.recipes.getRecipeWithDetails(recipeId);
    if (!recipeDetails) {
      return { missingIngredients: [], availableIngredients: [] };
    }

    const missingIngredients: ShoppingListResult["missingIngredients"] = [];
    const availableIngredients: ShoppingListResult["availableIngredients"] = [];

    for (const ingredient of recipeDetails.ingredients) {
      // Use findByNameOrSynonym for better matching
      const stockItems = await this.stocks.findByNameOrSynonym(ingredient.name);
      const totalStock = stockItems.reduce(
        (sum: number, item: Stock) => sum + item.quantity,
        0
      );

      if (totalStock === 0) {
        missingIngredients.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
        });
      } else {
        const firstStockItem = stockItems[0];
        availableIngredients.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          stockQuantity: totalStock,
          stockUnit: firstStockItem?.unit || "",
        });
      }
    }

    return {
      missingIngredients,
      availableIngredients,
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const [recipes, stockItems, cookingHistory] = await Promise.all([
      this.recipes.count(),
      this.stocks.count(),
      this.cookingHistory.count(),
    ]);

    return {
      recipes,
      stockItems,
      cookingHistory,
      totalRecords: recipes + stockItems + cookingHistory,
    };
  }

  /**
   * Clear all data from the database
   */
  async clearAllData(): Promise<void> {
    if (!database) {
      throw new Error("Database is not initialized");
    }

    const collections = [
      "recipe",
      "recipe_step",
      "recipe_ingredient",
      "stock",
      "steps_to_store",
      "cooking_history",
    ];

    for (const collectionName of collections) {
      try {
        const collection = database.collections.get(collectionName);
        const allRecords = await collection.query().fetch();

        if (allRecords.length > 0) {
          await database.write(async () => {
            await Promise.all(
              allRecords.map((record) => record.destroyPermanently())
            );
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error clearing ${collectionName}:`, error);
      }
    }
  }

  /**
   * Export all data from the database
   */
  async exportAllData(): Promise<{
    recipes: unknown[];
    stock: unknown[];
    cookingHistory: unknown[];
  }> {
    const [recipes, stockItems, cookingHistory] = await Promise.all([
      this.recipes.findAll(),
      this.stocks.findAll(),
      this.cookingHistory.findAll(),
    ]);

    return {
      recipes: recipes.map((r) => r._raw),
      stock: stockItems.map((s) => s._raw),
      cookingHistory: cookingHistory.map((c) => c._raw),
    };
  }

  /**
   * Health check method for debugging
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.recipes || !this.stocks || !this.cookingHistory) {
        return false;
      }

      const recipeCount = await this.recipes.count();
      return recipeCount >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Get raw database instance (for advanced operations only)
   */
  getDatabase() {
    return database;
  }
}

// Export a singleton instance
export const databaseFacade = new DatabaseFacade();

// Export for type usage
export default DatabaseFacade;
