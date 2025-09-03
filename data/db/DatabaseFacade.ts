import { database } from "./database";
import {
  recipeRepository,
  baseIngredientRepository,
  stockRepository,
  RecipeRepository,
  BaseIngredientRepository,
  StockRepository,
} from "./repositories";

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
    this.recipes = recipeRepository;
    this.ingredients = baseIngredientRepository;
    this.stock = stockRepository;
  }

  // Database management methods
  async clearAllData(): Promise<void> {
    await database.action(async () => {
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
        const collection = database.collections.get(collectionName);
        const records = await collection.query().fetch();
        await Promise.all(records.map((record) => record.destroyPermanently()));
      }
    });
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
    recipes: any[];
    ingredients: any[];
    stockItems: any[];
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

  // Check what recipes can be made with current stock
  async getAvailableRecipes(): Promise<{
    canMake: any[];
    partiallyCanMake: any[];
  }> {
    const allRecipes = await this.recipes.findAll();
    const canMake: any[] = [];
    const partiallyCanMake: any[] = [];

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
            availableIngredients: availableCount,
            totalIngredients: totalCount,
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

    const missingIngredients: any[] = [];
    const availableIngredients: any[] = [];

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
    recipesData: any[]
  ): Promise<{ success: number; errors: any[] }> {
    let success = 0;
    const errors: any[] = [];

    for (const recipeData of recipesData) {
      try {
        await this.recipes.createRecipeWithDetails(recipeData);
        success++;
      } catch (error) {
        errors.push({ recipe: recipeData, error: error.message });
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

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      // Try to perform a simple query
      await this.recipes.count();
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  // Get raw database instance (for advanced operations)
  getDatabase() {
    return database;
  }
}

// Export a singleton instance
export const databaseFacade = new DatabaseFacade();

// Export for type usage
export default DatabaseFacade;
