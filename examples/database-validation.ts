/**
 * Database Validation Script
 *
 * This script validates that the WatermelonDB implementation is working correctly
 * by performing basic operations and checking the results.
 */

import { database, storage } from "../data";

export async function validateWatermelonDBImplementation(): Promise<boolean> {
  console.log("🔍 Validating WatermelonDB Implementation...");

  try {
    // Test 1: Database Health Check
    console.log("Test 1: Database Health Check");
    const isHealthy = await database.isHealthy();
    if (!isHealthy) {
      throw new Error("Database health check failed");
    }
    console.log("✅ Database is healthy");

    // Test 2: Repository Access
    console.log("Test 2: Repository Access");
    const recipeCount = await database.recipes.count();
    const ingredientCount = await database.ingredients.count();
    const stockCount = await database.stock.count();
    console.log(
      `✅ Repositories accessible - Recipes: ${recipeCount}, Ingredients: ${ingredientCount}, Stock: ${stockCount}`
    );

    // Test 3: Create and Read Operations
    console.log("Test 3: Create and Read Operations");

    // Create a test ingredient
    const testIngredient = await database.ingredients.create({
      name: "Test Ingredient",
      synonyms: ["Test Item"],
    });
    console.log("✅ Created test ingredient:", testIngredient.id);

    // Read it back
    const retrieved = await database.ingredients.findById(testIngredient.id);
    if (!retrieved || retrieved.name !== "Test Ingredient") {
      throw new Error("Failed to retrieve created ingredient");
    }
    console.log("✅ Successfully retrieved ingredient");

    // Test 4: Search Functionality
    console.log("Test 4: Search Functionality");
    const searchResults = await database.ingredients.searchIngredients({
      searchTerm: "Test",
      limit: 10,
    });
    if (searchResults.length === 0) {
      throw new Error("Search failed to find test ingredient");
    }
    console.log("✅ Search functionality working");

    // Test 5: Complex Operations
    console.log("Test 5: Complex Operations");
    const stats = await database.getDatabaseStats();
    if (typeof stats.ingredients !== "number") {
      throw new Error("Database stats not working");
    }
    console.log("✅ Complex operations working, stats:", stats);

    // Test 6: Clean up test data
    console.log("Test 6: Cleanup");
    await database.ingredients.delete(testIngredient.id);
    const deletedCheck = await database.ingredients.findById(testIngredient.id);
    if (deletedCheck !== null) {
      throw new Error("Failed to delete test ingredient");
    }
    console.log("✅ Cleanup successful");

    console.log("🎉 All validation tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Validation failed:", error);
    return false;
  }
}

export async function validateStorageIntegration(): Promise<boolean> {
  console.log("🔍 Validating Storage Integration...");

  try {
    // Test that both storage systems can coexist

    // Test key-value storage
    await storage.setAsync("test_key", { message: "Hello from storage" });
    const storageValue = await storage.getAsync<{ message: string }>(
      "test_key"
    );
    if (!storageValue || storageValue.message !== "Hello from storage") {
      throw new Error("Key-value storage not working");
    }
    console.log("✅ Key-value storage working");

    // Test structured database
    const dbStats = await database.getDatabaseStats();
    if (typeof dbStats.totalRecords !== "number") {
      throw new Error("Structured database not working");
    }
    console.log("✅ Structured database working");

    // Clean up
    await storage.deleteAsync("test_key");
    console.log("✅ Storage integration validated");

    return true;
  } catch (error) {
    console.error("❌ Storage integration validation failed:", error);
    return false;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  (async () => {
    const dbValid = await validateWatermelonDBImplementation();
    const storageValid = await validateStorageIntegration();

    if (dbValid && storageValid) {
      console.log("🎉 All validations passed! WatermelonDB is ready to use.");
      process.exit(0);
    } else {
      console.log(
        "❌ Some validations failed. Please check the implementation."
      );
      process.exit(1);
    }
  })();
}
