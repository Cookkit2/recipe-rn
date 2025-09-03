/**
 * WatermelonDB Usage Example
 *
 * This file demonstrates how to use the WatermelonDB structured database
 * for recipe management in the application.
 */

import { databaseFacade } from "../data/db/DatabaseFacade";
import type {
  RecipeData,
  BaseIngredientData,
  StockData,
} from "../data/db/models";
// Example usage of the structured database
export async function demonstrateWatermelonDB() {
  console.log("🍉 WatermelonDB Demo Starting...");

  try {
    // 1. Check database health
    const isHealthy = await databaseFacade.isHealthy();
    console.log("Database health:", isHealthy ? "✅ Healthy" : "❌ Unhealthy");

    // 2. Get initial stats
    const initialStats = await databaseFacade.getDatabaseStats();
    console.log("Initial stats:", initialStats);

    // 3. Create a base ingredient
    const tomatoIngredient = await databaseFacade.ingredients.create({
      name: "Tomato",
      synonyms: ["Roma tomato", "Cherry tomato", "Plum tomato"],
    } as BaseIngredientData);
    console.log("Created ingredient:", tomatoIngredient.name);

    // 4. Add some stock
    const stockItem = await databaseFacade.stock.create({
      baseIngredientId: tomatoIngredient.id,
      name: "Fresh Tomatoes",
      quantity: 5,
      unit: "pieces",
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      category: "Vegetables",
    } as StockData);
    console.log(
      "Added stock item:",
      stockItem.name,
      stockItem.quantity,
      stockItem.unit
    );

    // 5. Create a recipe
    const recipe = await databaseFacade.recipes.createRecipeWithDetails({
      recipe: {
        title: "Simple Tomato Salad",
        description: "A fresh and healthy tomato salad",
        prepMinutes: 10,
        cookMinutes: 0,
        difficultyStars: 1,
        servings: 2,
        tags: ["healthy", "vegetarian", "quick"],
      } as RecipeData,
      steps: [
        {
          step: 1,
          title: "Prepare tomatoes",
          description: "Wash and slice the tomatoes",
          recipeId: "", // Will be set automatically
        },
      ],
      ingredients: [
        {
          recipeId: "", // Will be set automatically
          baseIngredientId: tomatoIngredient.id,
          name: "Fresh Tomatoes",
          quantity: "2 medium",
          notes: "Use ripe tomatoes for best flavor",
        },
      ],
    });
    console.log("Created recipe:", recipe.title);

    // 6. Search functionality
    const searchResults = await databaseFacade.searchEverything("tomato");
    console.log('Search results for "tomato":', {
      recipes: searchResults.recipes.length,
      ingredients: searchResults.ingredients.length,
      stockItems: searchResults.stockItems.length,
    });

    // 7. Check what recipes can be made
    const availability = await databaseFacade.getAvailableRecipes();
    console.log("Available recipes:", {
      canMake: availability.canMake.length,
      partiallyCanMake: availability.partiallyCanMake.length,
    });

    // 8. Get shopping list for our recipe
    const shoppingList = await databaseFacade.getShoppingListForRecipe(
      recipe.id
    );
    console.log("Shopping list:", {
      missing: shoppingList.missingIngredients.length,
      available: shoppingList.availableIngredients.length,
    });

    // 9. Get final stats
    const finalStats = await databaseFacade.getDatabaseStats();
    console.log("Final stats:", finalStats);

    // 10. Test stock management
    const expiringSoon = await databaseFacade.stock.getExpiringSoonItems();
    const lowStock = await databaseFacade.stock.getLowStockItems();
    console.log("Stock alerts:", {
      expiringSoon: expiringSoon.length,
      lowStock: lowStock.length,
    });

    console.log("🎉 WatermelonDB Demo completed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Demo failed:", error);
    return false;
  }
}

// Example of using individual repositories
export async function demonstrateRepositories() {
  console.log("📚 Repository Demo Starting...");

  try {
    // Using recipe repository directly
    const quickRecipes = await databaseFacade.recipes.getQuickRecipes(30);
    console.log("Quick recipes (≤30 mins):", quickRecipes.length);

    // Using ingredient repository
    const allTags = await databaseFacade.recipes.getAllTags();
    console.log("Available recipe tags:", allTags);

    // Using stock repository
    const categories = await databaseFacade.stock.getAllCategories();
    console.log("Stock categories:", categories);

    console.log("📚 Repository Demo completed!");
    return true;
  } catch (error) {
    console.error("❌ Repository demo failed:", error);
    return false;
  }
}

// Clean up function for testing
export async function cleanupDemo() {
  console.log("🧹 Cleaning up demo data...");

  try {
    await databaseFacade.clearAllData();
    console.log("✅ Demo data cleared");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  }
}
