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

// --- Lazy singleton (issue #733: cold-start / TTI) ---------------------------
// Previously the SQLiteAdapter + Database were constructed at module-eval
// time, which runs synchronously on the JS thread during the launch import
// graph and delays Time-to-Interactive. Construction is now deferred until
// the first property access via a memoizing Proxy. The Proxy itself is cheap
// to create (no native work), so merely importing this module no longer
// opens the database.
//
// Invariants preserved:
//  - WatermelonDB single-instance requirement: the real Database is built at
//    most once and cached module-side; all importers observe the same
//    instance (the Proxy identity is stable, and every access forwards to
//    that one cached Database).
//  - Access syntax is unchanged: `database.collections.get(...)`,
//    `database.write(...)`, `import { database }`, and
//    `require(".../database").database` all behave exactly as before.
//  - `modelClasses` wiring is preserved.
//
// Note: in Jest the module is typically fully mocked
// (`jest.mock(".../database", () => ({ database: {...} }))`), so this Proxy
// never runs in tests; the mock contract is unaffected.
let databaseInstance: Database | null = null;

function getDatabaseInstance(): Database {
  if (databaseInstance) return databaseInstance;
  const adapter = createAdapter();
  log.info("🔍 Creating WatermelonDB database instance (lazy)...");
  databaseInstance = new Database({
    adapter,
    modelClasses,
    // Note: Removed actionsEnabled as it may not be supported in this version
  });
  log.info("✅ WatermelonDB database created successfully");
  return databaseInstance;
}

/**
 * Lazily-constructed, memoized WatermelonDB singleton. See the lazy-singleton
 * note above. The Proxy forwards every property access to the single
 * underlying Database instance, constructing it on first access.
 */
export const database: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const instance = getDatabaseInstance();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    return prop in getDatabaseInstance();
  },
  ownKeys() {
    return Reflect.ownKeys(getDatabaseInstance());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getDatabaseInstance(), prop);
  },
});

// Helper function to get collections. Reads through the lazy `database`
// proxy so this module's import also stays off the synchronous launch path.
export const collections = {
  get recipes() {
    return database.collections.get("recipe");
  },
  get recipeSteps() {
    return database.collections.get("recipe_step");
  },
  get recipeIngredients() {
    return database.collections.get("recipe_ingredient");
  },
  get stock() {
    return database.collections.get("stock");
  },
  get stepsToStore() {
    return database.collections.get("steps_to_store");
  },
  get ingredientCategories() {
    return database.collections.get("ingredient_category");
  },
  get ingredientSynonyms() {
    return database.collections.get("ingredient_synonym");
  },
  get stockCategories() {
    return database.collections.get("stock_category");
  },
  get cookingHistory() {
    return database.collections.get("cooking_history");
  },
  get wasteLogs() {
    return database.collections.get("waste_log");
  },
  get consumptionLogs() {
    return database.collections.get("consumption_log");
  },
  get tailoredRecipeMappings() {
    return database.collections.get("tailored_recipe_mapping");
  },
  get households() {
    return database.collections.get("household");
  },
  get householdMembers() {
    return database.collections.get("household_member");
  },
};

// Export database as default
export default database;
