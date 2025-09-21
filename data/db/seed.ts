/**
 * Database Seeding Script
 *
 * This script populates the WatermelonDB database with sample data
 * for testing and development purposes.
 */

import { databaseFacade } from "./DatabaseFacade";
import { dummyPantryItems } from "../dummy/dummy-data";
import { dummyRecipesData } from "../dummy/dummy-recipes";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import type { ImageSourcePropType } from "react-native";

/**
 * Save an image asset to the file system and return the path
 * @param imageAsset - The asset from require() statement, string URL, or undefined
 * @returns Promise<string> - The file path where the image was saved, or empty string if failed
 */
async function saveImageAsset(
  imageAsset: ImageSourcePropType | string | undefined
): Promise<string> {
  try {
    // If undefined, return empty string
    if (!imageAsset) {
      return "";
    }

    // If it's already a string (URL), return it as is
    if (typeof imageAsset === "string") {
      return imageAsset;
    }

    // Handle object-style ImageSourcePropType
    if (
      typeof imageAsset === "object" &&
      "uri" in imageAsset &&
      imageAsset.uri
    ) {
      return imageAsset.uri;
    }

    // If it's a number (require() result) or module-style asset, resolve it
    const asset = Asset.fromModule(imageAsset as number);
    await asset.downloadAsync();

    if (!asset.localUri) {
      throw new Error("Failed to download asset");
    }

    // Create a filename based on the asset name or hash
    const filename = asset.name || `asset_${Date.now()}.png`;
    const destinationPath = `${FileSystem.cacheDirectory}${filename}`;

    // Copy the asset to cache directory
    await FileSystem.copyAsync({
      from: asset.localUri,
      to: destinationPath,
    });

    return destinationPath;
  } catch (error) {
    console.error("Error saving image asset:", error);
    // Return a fallback empty string if saving fails
    return "";
  }
}

/**
 * Map recipe ingredient names to pantry ingredient names
 * This helps match similar ingredients with different naming conventions
 */
function mapIngredientName(recipeName: string, pantryNames: string[]): string {
  const lower = recipeName.toLowerCase();

  // Direct mapping rules
  const mappings: Record<string, string> = {
    "boneless, skinless chicken breasts": "Chicken Breast",
    "boneless chicken breast": "Chicken Breast",
    "chicken breast": "Chicken Breast",
    "ripe tomatoes": "Tomatoes",
    "fresh tomatoes": "Tomatoes",
    tomato: "Tomatoes",
    "whole chicken": "Chicken Breast", // fallback
    "garlic cloves": "Garlic",
    garlic: "Garlic",
    onion: "Onions",
    "yellow onion": "Onions",
    "white onion": "Onions",
    pasta: "Pasta",
    "cooked rice": "Rice",
    rice: "Rice",
    potatoes: "Potato",
    potato: "Potato",
    "soy sauce": "Soy sauce",
    "light soy sauce": "Soy sauce",
    "olive oil": "Olive oil",
    "extra-virgin olive oil": "Olive oil",
    "bell peppers": "Bell pepper",
    "red bell pepper": "Bell pepper",
    "green bell pepper": "Bell pepper",
    "fresh ginger": "Ginger",
    "ginger root": "Ginger",
    "bacon strips": "Bacon",
    "bacon slices": "Bacon",
    "lemon juice": "Lemon",
    "fresh lemon": "Lemon",
    avocados: "Avocado",
    "fresh avocado": "Avocado",
  };

  // Check direct mappings first
  if (mappings[lower]) {
    return mappings[lower];
  }

  // Try partial matching - if recipe ingredient contains a pantry ingredient name
  for (const pantryName of pantryNames) {
    if (
      lower.includes(pantryName.toLowerCase()) ||
      pantryName.toLowerCase().includes(lower)
    ) {
      return pantryName;
    }
  }

  // If no match found, return the original name (will create new ingredient)
  return recipeName;
}

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
      // Save the image from asset into file system and return the path
      const imagePath = await saveImageAsset(item.image_url);
      if (baseIngredient) {
        await databaseFacade.stock.create({
          baseIngredientId: baseIngredient.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiryDate: item.expiry_date,
          type: item.type,
          category: item.category,
          imageUrl: imagePath, // Use the saved file path instead of the original asset
          x: item.x,
          y: item.y,
          scale: item.scale,
        });
      }
    }

    // Seed recipes with ingredients and steps
    console.log("👨‍🍳 Seeding recipes...");
    const pantryNames = Array.from(baseIngredients.keys());

    // for (const recipe of dummyRecipesData) {
    //   // Create base ingredients for recipe ingredients
    //   const recipeIngredients = [];
    //   for (const ingredient of recipe.ingredients) {
    //     // Try to map recipe ingredient name to existing pantry ingredient
    //     const mappedName = mapIngredientName(ingredient.name, pantryNames);
    //     let baseIngredient = baseIngredients.get(mappedName);

    //     if (!baseIngredient) {
    //       // If mapping didn't work, try original name
    //       baseIngredient = baseIngredients.get(ingredient.name);

    //       if (!baseIngredient) {
    //         // Create new ingredient if no match found
    //         baseIngredient = await databaseFacade.ingredients.create({
    //           name: ingredient.name,
    //           synonyms: mappedName !== ingredient.name ? [mappedName] : [],
    //         });
    //         baseIngredients.set(ingredient.name, baseIngredient);
    //       }
    //     }

    //     recipeIngredients.push({
    //       recipeId: "", // Will be set automatically
    //       baseIngredientId: baseIngredient.id,
    //       name: ingredient.name,
    //       quantity: ingredient.quantity,
    //       notes: ingredient.notes,
    //     });
    //   }

    //   // Create recipe with all details
    //   await databaseFacade.recipes.createRecipeWithDetails({
    //     recipe: {
    //       title: recipe.title,
    //       description: recipe.description,
    //       imageUrl: recipe.imageUrl,
    //       prepMinutes: recipe.prepMinutes || 0,
    //       cookMinutes: recipe.cookMinutes || 0,
    //       difficultyStars: recipe.difficultyStars || 1,
    //       servings: recipe.servings || 1,
    //       sourceUrl: recipe.sourceUrl,
    //       calories: recipe.calories,
    //       tags: recipe.tags,
    //     },
    //     steps: recipe.instructions.map((step) => ({
    //       step: step.step,
    //       title: step.title,
    //       description: step.description,
    //       recipeId: "", // Will be set automatically
    //     })),
    //     ingredients: recipeIngredients,
    //   });
    // }

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
