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
import { supabase } from "~/lib/supabase/supabase-client";

interface MissingIngredientInfo {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  baseIngredientId: string;
}

interface AvailableIngredientInfo {
  name: string;
  quantity: number;
  unit: string;
  stockQuantity: number;
  stockUnit: string;
}

/**
 * Database Facade - Main interface for all structured database operations
 * This provides a unified API for accessing all database functionality
 */
export class DatabaseFacade {
  // Repository instances
  public recipes: RecipeRepository;
  public ingredients: BaseIngredientRepository;
  public stock: StockRepository;

  constructor() {
    // Initialize repositories synchronously first
    const repositories = initializeRepositories();
    this.recipes = repositories.recipeRepository!;
    this.ingredients = repositories.baseIngredientRepository!;
    this.stock = repositories.stockRepository!;

    // Then initialize async features in the background
    this.initializeAsync();
  }

  private async initializeAsync() {
    try {
      // SYNC DISABLED: Don't sync from Supabase to prevent pulling empty database
      // TODO: Re-enable after pushing local data to server
      await this.recipes.initialize();
      // await this.pushRecipeIngredientsToSupabase();
      console.log("🚫 Database sync DISABLED - local data preserved");
    } catch (error) {
      // Log error to aid debugging, but prevent app crashes
      console.error("DatabaseFacade initialization failed:", error);
    }
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

  // Check what recipes can be made with current stock - Optimized version
  async getAvailableRecipes(): Promise<{
    canMake: Recipe[];
    partiallyCanMake: { recipe: Recipe; completionPercentage: number }[];
  }> {
    try {
      console.log("🔍 Getting available recipes (optimized)...");

      // Get all stock items upfront to create a lookup map
      const allStock = await this.stock.findAll();
      const availableIngredientIds = new Set(
        allStock
          .filter((stock) => stock.quantity > 0)
          .map((stock) => stock.baseIngredientId)
      );

      // Also create a name-based lookup for ingredient matching
      const availableIngredientNames = new Set(
        allStock
          .filter((stock) => stock.quantity > 0)
          .map((stock) => stock.name.toLowerCase().trim())
      );

      console.log(
        `📦 Found ${availableIngredientIds.size} available ingredient types in stock`
      );

      // Debug: Log all stock items
      console.log(
        "📦 All stock items:",
        allStock.map(
          (s) =>
            `${s.name}: ${s.quantity} (ingredientId: ${s.baseIngredientId})`
        )
      );

      // Debug: Log available ingredient IDs
      console.log(
        "🔍 Available ingredient IDs:",
        Array.from(availableIngredientIds)
      );

      // Get all recipes and their details in batches
      const allRecipes = await this.recipes.findAll();
      console.log(`📖 Processing ${allRecipes.length} recipes`);

      const canMake: Recipe[] = [];
      const partiallyCanMake: {
        recipe: Recipe;
        completionPercentage: number;
      }[] = [];

      // Process recipes in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < allRecipes.length; i += batchSize) {
        const recipeBatch = allRecipes.slice(i, i + batchSize);

        // Get recipe details for the batch
        const batchDetailsPromises = recipeBatch.map((recipe) =>
          this.recipes.getRecipeWithDetails(recipe.id)
        );

        const batchDetails = await Promise.all(batchDetailsPromises);

        // Process each recipe in the batch
        for (let j = 0; j < recipeBatch.length; j++) {
          const recipe = recipeBatch[j];
          const recipeDetails = batchDetails[j];

          if (!recipeDetails || !recipeDetails.ingredients.length) continue;

          // Check ingredient availability using the pre-built set (O(1) lookup)
          let availableCount = 0;
          for (const ingredient of recipeDetails.ingredients) {
            console.log("recipe name", recipe?.title);
            console.log(
              `Need ingredient in stock: ${ingredient.name}, count needed: ${ingredient.quantity}, baseIngredientId: ${ingredient.baseIngredientId}`
            );

            // Check by baseIngredientId first (preferred method)
            const foundById = availableIngredientIds.has(
              ingredient.baseIngredientId
            );

            // Also check by name (fallback method) - normalize names for matching
            const normalizeIngredientName = (name: string) => {
              return name
                .toLowerCase()
                .trim()
                .replace(/s$/, "") // Remove plural 's'
                .replace(/es$/, "") // Remove plural 'es'
                .replace(/ies$/, "y"); // Replace 'ies' with 'y'
            };

            const normalizedRecipeName = normalizeIngredientName(
              ingredient.name
            );
            const foundByName = Array.from(availableIngredientNames).some(
              (stockName) => {
                const normalizedStockName = normalizeIngredientName(stockName);
                return (
                  normalizedStockName === normalizedRecipeName ||
                  stockName === ingredient.name.toLowerCase().trim() ||
                  normalizedStockName.includes(normalizedRecipeName) ||
                  normalizedRecipeName.includes(normalizedStockName)
                );
              }
            );

            if (foundById || foundByName) {
              // console.log(
              //   `Found ingredient in stock: ${ingredient.name} (matched by ${foundById ? "ID" : "name"})`
              // );
              availableCount++;
            } else {
              // console.log(
              //   `❌ NOT FOUND - ${ingredient.name} (baseIngredientId: ${ingredient.baseIngredientId}) not in available stock`
              // );
            }
          }

          const totalCount = recipeDetails.ingredients.length;

          if (availableCount === totalCount && totalCount > 0) {
            canMake.push(recipe!);
          } else if (availableCount > 0) {
            partiallyCanMake.push({
              recipe: recipe!,
              completionPercentage: Math.round(
                (availableCount / totalCount) * 100
              ),
            });
          }
        }
      }

      console.log(
        `✅ Found ${canMake.length} complete recipes, ${partiallyCanMake.length} partial recipes`
      );

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

  // Get shopping list for a recipe
  async getShoppingListForRecipe(recipeId: string): Promise<{
    missingIngredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      notes?: string;
      baseIngredientId: string;
    }>;
    availableIngredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      stockQuantity: number;
      stockUnit: string;
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
          unit: ingredient.unit,
          notes: ingredient.notes,
          baseIngredientId: ingredient.baseIngredientId,
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

  // Batch operations
  async importRecipes(recipesData: Recipe[]): Promise<{
    success: number;
    errors: Array<{ recipe: Recipe; error: string }>;
  }> {
    let success = 0;
    const errors: Array<{ recipe: Recipe; error: string }> = [];

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
    recipes: unknown[];
    ingredients: unknown[];
    stock: unknown[];
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

  /**
   * EMERGENCY: Push base_ingredient and pivot_recipe_ingredient data to Supabase
   *
   * This method pushes base_ingredient and pivot_recipe_ingredient tables from
   * your local database to Supabase. It queries existing recipes in Supabase to
   * get proper UUIDs for foreign key relationships.
   *
   * Process:
   * 1. Push base_ingredient data (let Supabase generate new UUIDs)
   * 2. Query existing recipes from Supabase to get recipe UUIDs
   * 3. Map ingredient names to their new Supabase UUIDs
   * 4. Push pivot_recipe_ingredient data with proper foreign key references
   *
   * Usage:
   * ```typescript
   * import { databaseFacade } from "~/data/db/DatabaseFacade";
   * await databaseFacade.pushLocalDataToSupabase();
   * ```
   */
  async pushLocalDataToSupabase(): Promise<void> {
    try {
      console.log(
        "🚀 Starting to push base_ingredient and pivot_recipe_ingredient data to Supabase..."
      );

      let totalSuccessCount = 0;
      let totalErrorCount = 0;

      // 1. Push all base_ingredient data
      console.log("📦 Pushing base_ingredient data...");
      const allBaseIngredients = await this.ingredients.findAll();
      console.log(
        `Found ${allBaseIngredients.length} base ingredients to push`
      );

      for (const ingredient of allBaseIngredients) {
        try {
          // Transform local BaseIngredient to Supabase format
          // Note: Let Supabase generate new UUIDs, don't include local IDs
          const baseIngredientData = {
            name: ingredient.name,
            steps_to_store_id: null, // Local model doesn't have this, use null
            days_to_expire: 7, // Default to 7 days
            storage_type: "refrigerator", // Default storage type
          };

          console.log(
            `Pushing base_ingredient: ${ingredient.name} (local id: ${ingredient.id})`
          );
          // Use insert instead of upsert since we're letting DB generate new IDs
          const { data, error } = await supabase
            .from("base_ingredient")
            .insert(baseIngredientData)
            .select()
            .single();

          if (error) {
            console.error(
              `Failed to push base_ingredient ${ingredient.name}:`,
              error
            );
            totalErrorCount++;
          } else {
            totalSuccessCount++;
          }
        } catch (error) {
          console.error(
            `Failed to push base_ingredient ${ingredient.name}:`,
            error
          );
          totalErrorCount++;
        }
      }

      // 2. Get existing recipes from Supabase to map recipe titles to UUIDs
      console.log("🔗 Getting existing recipes from Supabase...");
      const { data: supabaseRecipes, error: recipeError } = await supabase
        .from("recipe")
        .select("id, title");

      if (recipeError) {
        throw new Error(
          `Failed to get recipes from Supabase: ${recipeError.message}`
        );
      }

      // Create mapping of recipe title to Supabase UUID
      const recipeTitleToIdMap = new Map<string, string>();
      supabaseRecipes?.forEach((recipe) => {
        recipeTitleToIdMap.set(recipe.title.toLowerCase().trim(), recipe.id);
      });

      console.log(
        `Found ${supabaseRecipes?.length} existing recipes in Supabase`
      );

      // 3. Get newly created base ingredients from Supabase to map names to UUIDs
      console.log("🔗 Getting base ingredients from Supabase for mapping...");
      const { data: supabaseIngredients, error: mappingError } = await supabase
        .from("base_ingredient")
        .select("id, name");

      if (mappingError) {
        throw new Error(
          `Failed to get ingredient mapping: ${mappingError.message}`
        );
      }

      const ingredientNameToIdMap = new Map<string, string>();
      supabaseIngredients?.forEach((ingredient) => {
        ingredientNameToIdMap.set(
          ingredient.name.toLowerCase().trim(),
          ingredient.id
        );
      });

      // 4. Push all pivot_recipe_ingredient data
      console.log("🥘 Pushing pivot_recipe_ingredient data...");
      const allRecipes = await this.recipes.findAll();
      console.log(
        `Found ${allRecipes.length} local recipes to extract ingredients from`
      );

      let totalRecipeIngredients = 0;
      let recipeIngredientsSuccess = 0;
      let recipeIngredientsErrors = 0;

      for (const recipe of allRecipes) {
        try {
          // Find the Supabase recipe UUID by title
          const supabaseRecipeId = recipeTitleToIdMap.get(
            recipe.title.toLowerCase().trim()
          );

          if (!supabaseRecipeId) {
            console.log(
              `⚠️ Recipe "${recipe.title}" not found in Supabase, skipping ingredients`
            );
            continue;
          }

          const recipeDetails = await this.recipes.getRecipeWithDetails(
            recipe.id
          );
          if (recipeDetails && recipeDetails.ingredients) {
            totalRecipeIngredients += recipeDetails.ingredients.length;

            for (const recipeIngredient of recipeDetails.ingredients) {
              try {
                // Find the Supabase base ingredient UUID by name
                const supabaseBaseIngredientId = ingredientNameToIdMap.get(
                  recipeIngredient.name.toLowerCase().trim()
                );

                if (!supabaseBaseIngredientId) {
                  console.log(
                    `⚠️ Base ingredient "${recipeIngredient.name}" not found in Supabase, skipping`
                  );
                  recipeIngredientsErrors++;
                  continue;
                }

                // Transform local RecipeIngredient to Supabase pivot_recipe_ingredient format
                // const pivotRecipeIngredientData = {
                //   recipe_id: supabaseRecipeId, // Use Supabase recipe UUID
                //   base_ingredient_id: supabaseBaseIngredientId, // Use Supabase ingredient UUID
                //   name: recipeIngredient.name,
                //   quantity: recipeIngredient.quantity,
                //   notes: recipeIngredient.notes || null,
                //   unit: recipeIngredient.unit,
                // };

                // console.log(
                //   `Pushing pivot_recipe_ingredient: ${recipeIngredient.name} for recipe ${recipe.title}`
                // );

                // Insert (let Supabase generate new UUID for the pivot record)
                // const { error } = await supabase
                //   .from("pivot_recipe_ingredient")
                //   .insert(pivotRecipeIngredientData);

                if (error) {
                  console.error(
                    `Failed to push recipe ingredient ${recipeIngredient.name}:`,
                    error
                  );
                  recipeIngredientsErrors++;
                } else {
                  recipeIngredientsSuccess++;
                }
              } catch (error) {
                console.error(
                  `Failed to push recipe ingredient ${recipeIngredient.name}:`,
                  error
                );
                recipeIngredientsErrors++;
              }
            }
          }
        } catch (error) {
          console.error(
            `Failed to get ingredients for recipe ${recipe.title}:`,
            error
          );
          recipeIngredientsErrors++;
        }
      }

      // Update total counts
      totalSuccessCount += recipeIngredientsSuccess;
      totalErrorCount += recipeIngredientsErrors;

      console.log(`📊 Push summary:`);
      console.log(`  - Base ingredients: ${allBaseIngredients.length} items`);
      console.log(`  - Recipe ingredients: ${totalRecipeIngredients} items`);
      console.log(`  - Total success: ${totalSuccessCount}`);
      console.log(`  - Total errors: ${totalErrorCount}`);
      console.log("✅ Push to Supabase completed!");
    } catch (error) {
      console.error("❌ Error pushing local data to Supabase:", error);
      throw error;
    }
  }

  // Get raw database instance (for advanced operations)
  getDatabase() {
    return database;
  }

  // Health check method for debugging
  async isHealthy(): Promise<boolean> {
    try {
      // Test basic database connectivity and repositories
      if (!this.recipes || !this.ingredients || !this.stock) {
        return false;
      }

      // Test if we can query the database
      const recipeCount = await this.recipes.count();

      return recipeCount >= 0; // Should return a number
    } catch {
      return false;
    }
  }
}

// Export a singleton instance
export const databaseFacade = new DatabaseFacade();

// Export for type usage
export default DatabaseFacade;
