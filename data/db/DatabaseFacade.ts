import { database } from "./database";
import type { BaseIngredient, Recipe, Stock } from "./models";
import {
  initializeRepositories,
  RecipeRepository,
  BaseIngredientRepository,
  StockRepository,
} from "./repositories";
import {
  convertToUnitSystem,
  roundToReasonablePrecision,
} from "~/utils/unit-converter";

interface MissingIngredientInfo {
  name: string;
  quantity: string;
  notes?: string;
  baseIngredientId: string;
}

interface AvailableIngredientInfo {
  name: string;
  quantity: string;
  stockQuantity: number;
  unit: string;
}

/**
 * Database Facade - Main interface for all structured database operations
 * This provides a unified API for accessing all database functionality
 */
export class DatabaseFacade {
  // Repository instances
  public readonly recipes: RecipeRepository;
  public readonly ingredients: BaseIngredientRepository;
  public readonly stock: StockRepository;

  constructor() {
    // Initialize repositories on first access
    const repositories = initializeRepositories();
    this.recipes = repositories.recipeRepository!;
    this.ingredients = repositories.baseIngredientRepository!;
    this.stock = repositories.stockRepository!;

    console.log("🔍 DatabaseFacade constructor complete");
    console.log("  - recipes initialized:", !!this.recipes);
    console.log("  - ingredients initialized:", !!this.ingredients);
    console.log("  - stock initialized:", !!this.stock);
  }

  // Database management methods
  async clearAllData(): Promise<void> {
    console.log("🧹 Clearing all database data...");

    if (!database) {
      throw new Error("Database is not initialized");
    }

    // Alternative approach without using database.action
    const collections = [
      "recipes",
      "recipe_steps",
      "recipe_ingredients",
      "base_ingredients",
      "ingredient_categories",
      "ingredient_category_assignments",
      "stock",
      "steps_to_store",
      "users",
    ];

    for (const collectionName of collections) {
      try {
        console.log(`🗑️ Clearing ${collectionName}...`);
        const collection = database.collections.get(collectionName);
        const allRecords = await collection.query().fetch();
        console.log(`  Found ${allRecords.length} records to delete`);

        // Delete records using database.write
        if (allRecords.length > 0) {
          await database.write(async () => {
            await Promise.all(
              allRecords.map((record) => record.destroyPermanently())
            );
          });
        }

        console.log(`✅ Cleared ${collectionName}`);
      } catch (error) {
        console.warn(`⚠️ Error clearing ${collectionName}:`, error);
      }
    }
  }

  async getDatabaseStats(): Promise<{
    recipes: number;
    ingredients: number;
    stockItems: number;
    categories: number;
    totalRecords: number;
  }> {
    const [recipes, ingredients, stockItems] = await Promise.all([
      this.recipes.count(),
      this.ingredients.count(),
      this.stock.count(),
    ]);

    const categories = await this.stock.getAllCategories();

    return {
      recipes,
      ingredients,
      stockItems,
      categories: categories.length,
      totalRecords: recipes + ingredients + stockItems,
    };
  }

  // Utility methods for common operations
  async searchEverything(searchTerm: string): Promise<{
    recipes: Recipe[];
    ingredients: BaseIngredient[];
    stockItems: Stock[];
  }> {
    const [recipes, ingredients, stockItems] = await Promise.all([
      this.recipes.searchRecipes({ searchTerm, limit: 10 }),
      this.ingredients.searchIngredients({ searchTerm, limit: 10 }),
      this.stock.searchStock({ searchTerm, limit: 10 }),
    ]);

    return {
      recipes,
      ingredients,
      stockItems,
    };
  }

  async convertUnits(toUnitSystem: "si" | "imperial"): Promise<void> {
    /**
     * Converts all stock item quantities + units to the requested system.
     * - Skips items whose unit is unknown / non-convertible (e.g. count units)
     * - Only writes when quantity or unit actually changes (to reduce churn)
     * - Rounds results with roundToReasonablePrecision (3 dp) to avoid drift
     * - Logs a concise progress report at the end
     *
     * Edge cases handled:
     *  - Missing or NaN quantity: item skipped automatically by converter
     *  - Unknown units: left unchanged
     *  - Count style units (unit / pcs / count): left unchanged
     *  - Extremely small floating differences (< 0.001): treated as no-op
     */

    try {
      // Get all stock items
      const allStockItems = await this.stock.findAll();
      console.log(`📦 Found ${allStockItems.length} stock items to convert`);

      if (allStockItems.length === 0) {
        console.log("ℹ️ No stock items to convert");
        return;
      }

      let convertedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      // Process items one by one - use repository update instead of model update
      for (const stockItem of allStockItems) {
        try {
          console.log(
            `🔍 Processing: ${stockItem.name} - ${stockItem.quantity} ${stockItem.unit}`
          );

          // Convert the unit
          const converted = convertToUnitSystem(
            stockItem.quantity,
            stockItem.unit,
            toUnitSystem
          );

          console.log(
            `🔄 Conversion result: ${converted.quantity} ${converted.unit}`
          );

          // Check if conversion would make any change
          const quantityChanged =
            Math.abs(converted.quantity - stockItem.quantity) > 0.001;
          const unitChanged = converted.unit !== stockItem.unit;

          if (quantityChanged || unitChanged) {
            // Use repository update method instead of model update method
            await this.stock.update(stockItem.id, {
              quantity: roundToReasonablePrecision(converted.quantity),
              unit: converted.unit,
            });

            convertedCount++;
          } else {
            console.log(
              `⏭️ Skipped ${stockItem.name}: already in correct format`
            );
            skippedCount++;
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to convert stock item ${stockItem.name} (${stockItem.id}):`,
            error
          );
          errorCount++;
        }
      }

      console.log(
        `✅ Conversion summary: ${convertedCount} converted, ${skippedCount} skipped, ${errorCount} errors`
      );
    } catch (error) {
      console.error(`❌ Error during unit conversion:`, error);
    }
  }

  // Check what recipes can be made with current stock
  async getAvailableRecipes(): Promise<{
    canMake: Recipe[];
    partiallyCanMake: { recipe: Recipe; completionPercentage: number }[];
  }> {
    const allRecipes = await this.recipes.findAll();
    const canMake: Recipe[] = [];
    const partiallyCanMake: { recipe: Recipe; completionPercentage: number }[] =
      [];

    for (const recipe of allRecipes) {
      try {
        const recipeDetails = await this.recipes.getRecipeWithDetails(
          recipe.id
        );
        if (!recipeDetails) continue;

        const ingredientChecks = await Promise.all(
          recipeDetails.ingredients.map(async (ingredient) => {
            return await this.stock.isIngredientInStock(
              ingredient.baseIngredientId
            );
          })
        );

        const availableCount = ingredientChecks.filter(Boolean).length;
        const totalCount = ingredientChecks.length;

        if (availableCount === totalCount && totalCount > 0) {
          canMake.push(recipe);
        } else if (availableCount > 0) {
          partiallyCanMake.push({
            recipe,
            // availableIngredients: availableCount,
            // totalIngredients: totalCount,
            completionPercentage: Math.round(
              (availableCount / totalCount) * 100
            ),
          });
        }
      } catch (error) {
        console.warn(`Error checking recipe ${recipe.id}:`, error);
      }
    }

    return {
      canMake,
      partiallyCanMake: partiallyCanMake.sort(
        (a, b) => b.completionPercentage - a.completionPercentage
      ),
    };
  }

  // Get shopping list for a recipe
  async getShoppingListForRecipe(recipeId: string): Promise<{
    missingIngredients: Array<{
      name: string;
      quantity: string;
      notes?: string;
      baseIngredientId: string;
    }>;
    availableIngredients: Array<{
      name: string;
      quantity: string;
      stockQuantity: number;
      unit: string;
    }>;
  }> {
    const recipeDetails = await this.recipes.getRecipeWithDetails(recipeId);
    if (!recipeDetails) {
      return { missingIngredients: [], availableIngredients: [] };
    }

    const missingIngredients: MissingIngredientInfo[] = [];
    const availableIngredients: AvailableIngredientInfo[] = [];

    for (const ingredient of recipeDetails.ingredients) {
      const stockItems = await this.stock.getStockByIngredient(
        ingredient.baseIngredientId
      );
      const totalStock = stockItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      if (totalStock === 0) {
        missingIngredients.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          notes: ingredient.notes,
          baseIngredientId: ingredient.baseIngredientId,
        });
      } else {
        const firstStockItem = stockItems[0];
        availableIngredients.push({
          name: ingredient.name,
          quantity: ingredient.quantity,
          stockQuantity: totalStock,
          unit: firstStockItem?.unit || "",
        });
      }
    }

    return {
      missingIngredients,
      availableIngredients,
    };
  }

  // Batch operations
  async importRecipes(
    recipesData: Recipe[]
  ): Promise<{ success: number; errors: any[] }> {
    let success = 0;
    const errors = [];

    for (const recipeData of recipesData) {
      try {
        await this.recipes.createRecipeWithDetails({ recipe: recipeData });
        success++;
      } catch (error) {
        errors.push({
          recipe: recipeData,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { success, errors };
  }

  async exportAllData(): Promise<{
    recipes: any[];
    ingredients: any[];
    stock: any[];
    categories: string[];
  }> {
    const [recipes, ingredients, stockItems, categories] = await Promise.all([
      this.recipes.findAll(),
      this.ingredients.findAll(),
      this.stock.findAll(),
      this.stock.getAllCategories(),
    ]);

    return {
      recipes: recipes.map((r) => r._raw),
      ingredients: ingredients.map((i) => i._raw),
      stock: stockItems.map((s) => s._raw),
      categories,
    };
  }

  // Get raw database instance (for advanced operations)
  getDatabase() {
    return database;
  }

  // Health check method for debugging
  async isHealthy(): Promise<boolean> {
    try {
      console.log("🔍 DatabaseFacade health check");
      console.log("  - recipes:", !!this.recipes);
      console.log("  - ingredients:", !!this.ingredients);
      console.log("  - stock:", !!this.stock);

      // Test basic database connectivity
      const collections = database.collections;
      console.log("  - database collections:", Object.keys(collections.map));

      // Test if we can query the database
      const recipeCount = await this.recipes.count();
      console.log("  - recipe count:", recipeCount);

      return true;
    } catch (error) {
      console.error("❌ Database health check failed:", error);
      return false;
    }
  }
}

// Export a singleton instance with fallback
console.log("🔍 Creating DatabaseFacade singleton...");

export let databaseFacade: DatabaseFacade;

try {
  console.log("🔍 Initializing DatabaseFacade...");
  databaseFacade = new DatabaseFacade();
  console.log("✅ DatabaseFacade created successfully");
} catch (error) {
  console.error("❌ Failed to create DatabaseFacade:", error);
  console.error("Error details:", error);
  throw error;
}

// Export for type usage
export default DatabaseFacade;
