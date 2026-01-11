/**
 * Database Seeding Script
 *
 * This script populates the WatermelonDB database with sample data
 * for testing and development purposes.
 */

import { databaseFacade } from "./DatabaseFacade";
import { dummyPantryItems } from "~/data/dummy/dummy-data";
import { File, Paths } from "expo-file-system";
import { Asset } from "expo-asset";
import type { ImageSourcePropType } from "react-native";
import { log } from "~/utils/logger";

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
    const destinationFile = new File(Paths.cache, filename);

    // Copy the asset to cache directory
    const sourceFile = new File(asset.localUri);
    sourceFile.copy(destinationFile);

    return destinationFile.uri;
  } catch (error) {
    log.error("Error saving image asset:", error);
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
  log.info("🌱 Starting database seeding...");

  try {
    // Clear existing data
    log.info("🧹 Clearing existing data...");
    await databaseFacade.clearAllData();

    // Seed stock items
    log.info("📦 Seeding stock items...");
    for (const item of dummyPantryItems) {
      // Save the image from asset into file system and return the path
      const imagePath = await saveImageAsset(item.image_url);

      await databaseFacade.createStock({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        expirationDate: item.expiry_date?.getTime(),
        storageType: item.type,
        imageUrl: imagePath, // Use the saved file path instead of the original asset
        x: item.x,
        y: item.y,
        scale: item.scale,
      });
    }

    // Recipes are synced from Supabase during initialization
    // No need to seed them manually
    log.info("👨‍🍳 Recipes will be synced from Supabase...");

    // Get final stats
    const stats = await databaseFacade.getDatabaseStats();
    log.info("📊 Database seeding completed successfully!");
    log.info("📈 Database stats:", stats);

    return true;
  } catch (error) {
    log.error("❌ Error seeding database:", error);
    throw error;
  }
}

/**
 * Quick function to add sample data for testing
 */
export async function addQuickSampleData(): Promise<boolean> {
  // Add a simple stock item
  await databaseFacade.createStock({
    name: "Fresh Tomatoes",
    quantity: 5,
    unit: "pieces",
    expirationDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    storageType: "fridge",
  });

  // Add a simple recipe
  await databaseFacade.createRecipe({
    title: "Simple Tomato Salad",
    description: "A fresh and healthy tomato salad",
    prepMinutes: 10,
    cookMinutes: 0,
    difficultyStars: 1,
    servings: 2,
    tags: ["healthy", "vegetarian", "quick"],
    steps: [
      {
        step: 1,
        title: "Prepare tomatoes",
        description: "Wash and slice the tomatoes",
      },
      {
        step: 2,
        title: "Season and serve",
        description: "Add salt, pepper, and olive oil. Serve immediately.",
      },
    ],
    ingredients: [
      {
        name: "Fresh Tomatoes",
        quantity: 2,
        unit: "units",
        notes: "Use ripe tomatoes for best flavor",
      },
    ],
  });

  return true;
}

/**
 * Development helper to check database contents
 */
export async function checkDatabase() {
  const stats = await databaseFacade.getDatabaseStats();
  return stats;
}
