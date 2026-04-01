import { Platform } from "react-native";
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";

import schema from "./schema";
import migrations from "./migrations";
import { modelClasses } from "./models";
import { log } from "~/utils/logger";

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
        log.error("Browser ran out of disk space:", error);
        // Could show user a message to clear data or reload
      },
      onSetUpError: (error) => {
        log.error("Database failed to load:", error);
        // Could show user a message to reload the app
      },
      extraIncrementalIDBOptions: {
        onDidOverwrite: () => {
          log.warn("Database overwritten by another tab");
          // Could try to sync or alert user
        },
        onversionchange: () => {
          log.warn("Database deleted in another tab");
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
      jsi: false, // Disabled: JSI can cause migration failures; re-enable after migrations succeed
      onSetUpError: (error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error("Database failed to load:", err.message, err.stack);
        if ("code" in err) log.error("Error code:", (err as { code?: unknown }).code);
        if ("message" in (error as object))
          log.error("Raw error message:", (error as { message?: string }).message);
        // Could show user a message to reload the app or clear data
      },
    });
  }
};

// Create the database instance
const adapter = createAdapter();

log.info("🔍 Creating WatermelonDB database instance...");

export const database = new Database({
  adapter,
  modelClasses,
  // Note: Removed actionsEnabled as it may not be supported in this version
});

log.info("✅ WatermelonDB database created successfully");

// Helper function to get collections
export const collections = {
  recipes: database.collections.get("recipe"),
  recipeSteps: database.collections.get("recipe_step"),
  recipeIngredients: database.collections.get("recipe_ingredient"),
  stock: database.collections.get("stock"),
  stepsToStore: database.collections.get("steps_to_store"),
  ingredientCategories: database.collections.get("ingredient_category"),
  ingredientSynonyms: database.collections.get("ingredient_synonym"),
  stockCategories: database.collections.get("stock_category"),
  cookingHistory: database.collections.get("cooking_history"),
  wasteLogs: database.collections.get("waste_log"),
  consumptionLogs: database.collections.get("consumption_log"),
  tailoredRecipeMappings: database.collections.get("tailored_recipe_mapping"),
};

log.info("✅ Database collections initialized");

// Export database as default
export default database;
