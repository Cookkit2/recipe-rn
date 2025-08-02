/**
 * Storage Facade Usage Examples
 *
 * This file demonstrates how to use the storage facade in different scenarios.
 * Copy and modify these examples for your own use cases.
 */

import {
  StorageFactory,
  storageFacade,
  type StorageConfig,
} from "~/data/storage";
import { pantryRepository } from "~/data/pantry-repository";
import { recipeRepository } from "~/data/repositories/recipe-repository";
import { getStorageConfig } from "~/data/storage-config";
import type { PantryItem } from "~/types/PantryItem";

// ===== BASIC USAGE =====

export function basicStorageExample() {
  // Initialize storage (usually done once in your app)
  StorageFactory.initialize({ type: "mmkv" });

  // Store simple values
  storageFacade.set("user-preference", { theme: "dark", language: "en" });
  storageFacade.setString("last-sync", new Date().toISOString());

  // Retrieve values
  const preferences = storageFacade.get<{ theme: string; language: string }>(
    "user-preference"
  );
  const lastSync = storageFacade.getString("last-sync");

  console.log("Preferences:", preferences);
  console.log("Last sync:", lastSync);
}

// ===== SWITCHING STORAGE BACKENDS =====

export function storageBackendExample() {
  // Start with MMKV
  console.log("Using MMKV...");
  StorageFactory.initialize({ type: "mmkv" });
  storageFacade.set("example-key", { data: "mmkv-data" });

  // Switch to AsyncStorage
  console.log("Switching to AsyncStorage...");
  StorageFactory.switchStorage({ type: "async-storage" });

  // Note: AsyncStorage requires async operations
  storageFacade
    .setAsync("example-key", { data: "async-storage-data" })
    .then(() => storageFacade.getAsync("example-key"))
    .then((data) => console.log("AsyncStorage data:", data));

  // Switch back to MMKV with encryption
  console.log("Switching to encrypted MMKV...");
  StorageFactory.switchStorage({
    type: "mmkv",
    options: { encryptionKey: "my-secret-key" },
  });
  storageFacade.set("secure-data", { sensitive: "encrypted-information" });
}

// ===== USING REPOSITORIES =====

export function repositoryExample() {
  // Pantry repository examples
  console.log("=== Pantry Repository Examples ===");

  // Add a new item with auto-generated ID
  const newItem = pantryRepository.addWithAutoId({
    name: "Fresh Bananas",
    quantity: "6 pieces",
    category: "Fruit",
    type: "fridge",
    image_url: require("~/assets/images/banana.png"),
    x: 100,
    y: 200,
    scale: 1,
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    steps_to_store: [
      {
        id: 1,
        title: "Store in fridge",
        description: "Keep fresh",
        sequence: 1,
      },
    ],
  });
  console.log("Added item:", newItem);

  // Query operations
  const fridgeItems = pantryRepository.getByType("fridge");
  const expiringSoon = pantryRepository.getExpiringSoon(3); // Items expiring in 3 days
  const searchResults = pantryRepository.searchByName("banana");

  console.log("Fridge items:", fridgeItems.length);
  console.log("Expiring soon:", expiringSoon.length);
  console.log("Search results:", searchResults.length);

  // Update an item
  if (newItem) {
    pantryRepository.update({
      ...newItem,
      quantity: "4 pieces", // Updated quantity
    });
  }

  // Recipe repository examples
  console.log("=== Recipe Repository Examples ===");

  const newRecipe = recipeRepository.addWithAutoId({
    title: "Banana Smoothie",
    imageUrl: "https://example.com/smoothie.jpg",
    recipeId: "recipe-123",
    x: 50,
    y: 100,
    scale: 1.0,
  });
  console.log("Added recipe:", newRecipe);
}

// ===== BATCH OPERATIONS =====

export function batchOperationsExample() {
  console.log("=== Batch Operations ===");

  // Set multiple values at once
  storageFacade.setBatch({
    "setting-1": { enabled: true },
    "setting-2": { value: 42 },
    "setting-3": { name: "example" },
  });

  // Get multiple values at once
  const settings = storageFacade.getBatch<any>([
    "setting-1",
    "setting-2",
    "setting-3",
  ]);
  console.log("Batch retrieved:", settings);

  // Delete multiple keys
  storageFacade.deleteBatch(["setting-1", "setting-2"]);

  // Verify deletion
  console.log("After deletion:", storageFacade.getAllKeys());
}

// ===== ENVIRONMENT CONFIGURATION =====

export function environmentConfigExample() {
  console.log("=== Environment Configuration ===");

  // Use environment-specific configuration
  const config = getStorageConfig();
  StorageFactory.initialize(config);

  console.log("Current storage config:", StorageFactory.getCurrentConfig());
  console.log("Storage info:", storageFacade.getInfo());
}

// ===== MIGRATION EXAMPLE =====

export async function migrationExample() {
  console.log("=== Storage Migration ===");

  // Set up some data in MMKV
  StorageFactory.initialize({ type: "mmkv" });
  storageFacade.set("migration-test", { data: "original" });

  // Migrate to AsyncStorage
  try {
    await StorageFactory.migrateStorage(
      { type: "mmkv" },
      { type: "async-storage" },
      ["migration-test"] // Only migrate specific keys
    );

    console.log("Migration completed successfully");

    // Verify migration
    const migratedData = await storageFacade.getAsync("migration-test");
    console.log("Migrated data:", migratedData);
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// ===== ERROR HANDLING =====

export function errorHandlingExample() {
  console.log("=== Error Handling ===");

  try {
    // This might fail if storage is not properly initialized
    storageFacade.set("test-key", { data: "test" });

    // Safe operations with defaults
    const value = storageFacade.getWithDefault("missing-key", {
      default: "value",
    });
    console.log("Value with default:", value);

    // Conditional operations
    const updated = storageFacade.update("existing-key", { updated: true });
    const created = storageFacade.setIfNotExists("new-key", { created: true });

    console.log("Update result:", updated);
    console.log("Create result:", created);
  } catch (error) {
    console.error("Storage operation failed:", error);
  }
}

// ===== ADVANCED REPOSITORY USAGE =====

export function advancedRepositoryExample() {
  console.log("=== Advanced Repository Usage ===");

  // Get repository info
  const pantryInfo = pantryRepository.getInfo();
  console.log("Pantry repository info:", pantryInfo);

  // Backup and restore
  pantryRepository.backup("pantry-backup-2024");

  // Clear all data
  pantryRepository.clear();
  console.log("After clear:", pantryRepository.isEmpty());

  // Restore from backup
  pantryRepository.restore("pantry-backup-2024");
  console.log("After restore:", pantryRepository.count());

  // Bulk operations
  const itemsToUpdate: PantryItem[] = pantryRepository.getAll().map((item) => ({
    ...item,
    updated_at: new Date(),
  }));

  const updatedCount = pantryRepository.updateMany(itemsToUpdate);
  console.log("Updated items:", updatedCount);

  // Categories and analytics
  const categories = pantryRepository.getCategories();
  const expired = pantryRepository.getExpired();

  console.log("Available categories:", categories);
  console.log("Expired items:", expired.length);
}

// ===== PERFORMANCE TESTING =====

export function performanceExample() {
  console.log("=== Performance Testing ===");

  const iterations = 1000;

  // Test individual operations
  console.time("Individual operations");
  for (let i = 0; i < iterations; i++) {
    storageFacade.set(`test-${i}`, { id: i, data: `test-data-${i}` });
  }
  console.timeEnd("Individual operations");

  // Test batch operations
  const batchData: Record<string, any> = {};
  for (let i = 0; i < iterations; i++) {
    batchData[`batch-${i}`] = { id: i, data: `batch-data-${i}` };
  }

  console.time("Batch operations");
  storageFacade.setBatch(batchData);
  console.timeEnd("Batch operations");

  // Clean up
  const keysToDelete = Object.keys(batchData);
  storageFacade.deleteBatch(keysToDelete);

  console.log("Performance test completed");
}

// ===== MAIN DEMO FUNCTION =====

export async function runAllExamples() {
  console.log("🚀 Starting Storage Facade Examples...\n");

  basicStorageExample();
  storageBackendExample();
  repositoryExample();
  batchOperationsExample();
  environmentConfigExample();
  await migrationExample();
  errorHandlingExample();
  advancedRepositoryExample();
  performanceExample();

  console.log("\n✅ All examples completed!");
}

// Uncomment to run examples:
// runAllExamples().catch(console.error);
