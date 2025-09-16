/**
 * Database Seeding Script
 *
 * This script populates the WatermelonDB database with sample data
 * for testing and development purposes.
 */

import { databaseFacade } from "./DatabaseFacade";
import { dummyPantryItems } from "../dummy/dummy-data";
import { dummyRecipesData } from "../dummy/dummy-recipes";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await databaseFacade.clearAllData();

    // Seed base ingredients from pantry items
    console.log("🥕 Seeding base ingredients...");
    const baseIngredients = new Map();

    for (const item of dummyPantryItems) {
      if (!baseIngredients.has(item.name)) {
        const ingredient = await databaseFacade.ingredients.create({
          name: item.name,
          synonyms: [],
        });
        baseIngredients.set(item.name, ingredient);
      }
    }

    // Seed stock items
    console.log("📦 Seeding stock items...");
    for (const item of dummyPantryItems) {
      const baseIngredient = baseIngredients.get(item.name);
      if (baseIngredient) {
        await databaseFacade.stock.create({
          baseIngredientId: baseIngredient.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiryDate: item.expiry_date,
          type: item.type,
          category: item.category,
          imageUrl:
            typeof item.image_url === "string" ? item.image_url : undefined,
          x: item.x,
          y: item.y,
          scale: item.scale,
        });
      }
    }

    // Seed recipes with ingredients and steps
    console.log("👨‍🍳 Seeding recipes...");
    for (const recipe of dummyRecipesData) {
      // Create base ingredients for recipe ingredients
      const recipeIngredients = [];
      for (const ingredient of recipe.ingredients) {
        let baseIngredient = baseIngredients.get(ingredient.name);

        if (!baseIngredient) {
          baseIngredient = await databaseFacade.ingredients.create({
            name: ingredient.name,
            synonyms: [],
          });
          baseIngredients.set(ingredient.name, baseIngredient);
        }

        recipeIngredients.push({
          recipeId: "", // Will be set automatically
          baseIngredientId: baseIngredient.id,
          name: ingredient.name,
          quantity: ingredient.quantity,
          notes: ingredient.notes,
        });
      }

      // Create recipe with all details
      await databaseFacade.recipes.createRecipeWithDetails({
        recipe: {
          title: recipe.title,
          description: recipe.description,
          imageUrl: recipe.imageUrl,
          prepMinutes: recipe.prepMinutes || 0,
          cookMinutes: recipe.cookMinutes || 0,
          difficultyStars: recipe.difficultyStars || 1,
          servings: recipe.servings || 1,
          sourceUrl: recipe.sourceUrl,
          calories: recipe.calories,
          tags: recipe.tags,
        },
        steps: recipe.instructions.map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
          recipeId: "", // Will be set automatically
        })),
        ingredients: recipeIngredients,
      });
    }

    // Get final stats
    const stats = await databaseFacade.getDatabaseStats();
    console.log("📊 Database seeding completed successfully!");
    console.log("📈 Database stats:", stats);

    return true;
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

/**
 * Quick function to add sample data for testing
 */
export async function addSampleData() {
  console.log("🎯 Adding quick sample data...");

  try {
    // Add a simple ingredient
    const tomato = await databaseFacade.ingredients.create({
      name: "Fresh Tomatoes",
      synonyms: ["Roma tomato", "Cherry tomato", "Plum tomato"],
    });

    // Add stock for the ingredient
    await databaseFacade.stock.create({
      baseIngredientId: tomato.id,
      name: "Fresh Tomatoes",
      quantity: 5,
      unit: "pieces",
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      type: "fridge",
      category: "Vegetables",
    });

    // Add a simple recipe
    await databaseFacade.recipes.createRecipeWithDetails({
      recipe: {
        title: "Simple Tomato Salad",
        description: "A fresh and healthy tomato salad",
        prepMinutes: 10,
        cookMinutes: 0,
        difficultyStars: 1,
        servings: 2,
        tags: ["healthy", "vegetarian", "quick"],
      },
      steps: [
        {
          step: 1,
          title: "Prepare tomatoes",
          description: "Wash and slice the tomatoes",
          recipeId: "",
        },
        {
          step: 2,
          title: "Season and serve",
          description: "Add salt, pepper, and olive oil. Serve immediately.",
          recipeId: "",
        },
      ],
      ingredients: [
        {
          recipeId: "",
          baseIngredientId: tomato.id,
          name: "Fresh Tomatoes",
          quantity: "2 medium",
          notes: "Use ripe tomatoes for best flavor",
        },
      ],
    });

    console.log("✅ Sample data added successfully!");
    return true;
  } catch (error) {
    console.error("❌ Error adding sample data:", error);
    throw error;
  }
}

/**
 * Development helper to check database contents
 */
export async function checkDatabase() {
  console.log("🔍 Checking database contents...");

  try {
    const stats = await databaseFacade.getDatabaseStats();
    console.log("📊 Current database stats:", stats);

    if (stats.recipes > 0) {
      const recipes = await databaseFacade.recipes.findAll();
      console.log(
        "🍳 Sample recipes:",
        recipes.slice(0, 3).map((r) => r.title)
      );
    }

    if (stats.ingredients > 0) {
      const ingredients = await databaseFacade.ingredients.findAll();
      console.log(
        "🥕 Sample ingredients:",
        ingredients.slice(0, 5).map((i) => i.name)
      );
    }

    if (stats.stockItems > 0) {
      const stock = await databaseFacade.stock.findAll();
      console.log(
        "📦 Sample stock items:",
        stock.slice(0, 5).map((s) => `${s.name} (${s.quantity} ${s.unit})`)
      );
    }

    return stats;
  } catch (error) {
    console.error("❌ Error checking database:", error);
    throw error;
  }
}
