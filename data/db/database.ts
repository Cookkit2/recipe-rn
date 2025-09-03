import { Platform } from "react-native";
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";

import schema from "./schema";
import migrations from "./migrations";
import { modelClasses } from "./models";

// Create the adapter based on platform
const createAdapter = () => {
  if (Platform.OS === "web") {
    // Web platform uses LokiJS
    return new LokiJSAdapter({
      schema,
      migrations,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
      dbName: "recipe_app",
      onQuotaExceededError: (error) => {
        console.error("Browser ran out of disk space:", error);
        // Could show user a message to clear data or reload
      },
      onSetUpError: (error) => {
        console.error("Database failed to load:", error);
        // Could show user a message to reload the app
      },
      extraIncrementalIDBOptions: {
        onDidOverwrite: () => {
          console.warn("Database overwritten by another tab");
          // Could try to sync or alert user
        },
        onversionchange: () => {
          console.warn("Database deleted in another tab");
          // Could reload the page
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        },
      },
    });
  } else {
    // React Native uses SQLite
    return new SQLiteAdapter({
      schema,
      migrations,
      dbName: "recipe_app",
      jsi: true, // Use JSI for better performance
      onSetUpError: (error) => {
        console.error("Database failed to load:", error);
        // Could show user a message to reload the app or clear data
      },
    });
  }
};

// Create the database instance
const adapter = createAdapter();

export const database = new Database({
  adapter,
  modelClasses,
  actionsEnabled: true, // Enable database actions for better performance
});

// Helper function to get collections
export const collections = {
  recipes: database.collections.get("recipes"),
  recipeSteps: database.collections.get("recipe_steps"),
  baseIngredients: database.collections.get("base_ingredients"),
  ingredientCategories: database.collections.get("ingredient_categories"),
  recipeIngredients: database.collections.get("recipe_ingredients"),
  ingredientCategoryAssignments: database.collections.get(
    "ingredient_category_assignments"
  ),
  stock: database.collections.get("stock"),
  stepsToStore: database.collections.get("steps_to_store"),
  users: database.collections.get("users"),
};

// Export database as default
export default database;
