import { Q, type Model } from "@nozbe/watermelondb";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";
import { database } from "~/data/db/database";
import type { Stock, StepsToStore } from "~/data/db/models";
import type IngredientCategory from "~/data/db/models/IngredientCategory";
import type IngredientSynonym from "~/data/db/models/IngredientSynonym";
import type StockCategory from "~/data/db/models/StockCategory";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import {
  withErrorHandling,
  withErrorLogging,
  logAndWrapResult,
  wrapResult,
} from "~/utils/api-error-handler";
import type { AppResult } from "~/utils/result";
import type { AppError } from "~/types/AppError";
import { log } from "~/utils/logger";
import { resolveBaseIngredientId, prepareStockData } from "./api-helpers";

// ---------------------------------------------------------------------------
// Core (shared) logic — called by both the throw-based and Result-based public
// methods so the business logic is written only once per operation.
// ---------------------------------------------------------------------------

/** Fetch all pantry items – shared by fetchAllPantryItems & fetchAllPantryItemsResult. */
async function fetchAllPantryItemsCore(): Promise<PantryItem[]> {
  log.info("🔍 Fetching pantry items...");

  const isHealthy = await databaseFacade.isHealthy();
  log.info("Database healthy:", isHealthy);

  const stockCount = await databaseFacade.getStockCount();
  log.info("Stock count in database:", stockCount);

  const stockItems = await databaseFacade.getAllStock();

  if (stockItems.length === 0) {
    log.warn("⚠️ No stock items found in database");
    return [];
  }

  const batchSize = 100;
  const pantryItemsConverted: PantryItem[] = [];

  for (let i = 0; i < stockItems.length; i += batchSize) {
    const batch = stockItems.slice(i, i + batchSize);
    const converted = await convertStockToPantryItemBatch(batch);
    pantryItemsConverted.push(...converted);
  }

  log.info("✅ Converted pantry items:", pantryItemsConverted.length);
  return pantryItemsConverted;
}

/** Add a single pantry item – shared by addPantryItem & addPantryItemResult. */
async function addPantryItemCore(
  item: Omit<PantryItem, "id" | "created_at" | "updated_at">
): Promise<PantryItem> {
  log.info("🔍 Adding pantry item:", item);

  const baseIngredientId = await resolveBaseIngredientId(item.name);
  const stockData = prepareStockData(item, baseIngredientId);

  log.info("📦 Creating stock item with data:", stockData);

  const stockItem = await databaseFacade.createStock(stockData);

  log.info("✅ Stock item created:", stockItem.id, stockItem.name);
  log.info("📊 Stock item details:", {
    id: stockItem.id,
    name: stockItem.name,
    quantity: stockItem.quantity,
    backgroundColor: stockItem.backgroundColor,
  });

  const convertedItem = (await convertStockToPantryItemBatch([stockItem]))[0] as PantryItem;
  log.info("✅ Converted pantry item:", convertedItem);

  return convertedItem;
}

/** Update a pantry item – shared by updatePantryItem & updatePantryItemResult. */
async function updatePantryItemCore(id: string, updates: Partial<PantryItem>): Promise<PantryItem> {
  const stock = await databaseFacade.getStockById(id);

  if (!stock) {
    throw new Error("Stock item not found");
  }

  await stock.updateStock({
    name: updates.name,
    quantity: updates.quantity,
    unit: updates.unit,
    expiryDate: updates.expiry_date,
    storageType: updates.type,
    backgroundColor: updates.background_color,
    imageUrl: typeof updates.image_url === "string" ? updates.image_url : undefined,
  });

  // Fetch the updated item
  const updatedStock = await databaseFacade.getStockById(id);
  if (!updatedStock) {
    throw new Error("Failed to fetch updated stock item");
  }

  const batchResult = await convertStockToPantryItemBatch([updatedStock]);
  return batchResult[0] as PantryItem;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pure API functions for pantry operations
 * These functions only handle database interactions and data transformation
 */
export const pantryApi = {
  /**
   * Fetch all pantry items from database
   */
  async fetchAllPantryItems(): Promise<PantryItem[]> {
    return withErrorHandling(() => fetchAllPantryItemsCore(), "Error fetching pantry items", []);
  },

  /**
   * Result-based variant of fetchAllPantryItems.
   */
  async fetchAllPantryItemsResult(): Promise<AppResult<PantryItem[], AppError>> {
    return logAndWrapResult(() => fetchAllPantryItemsCore(), "Error fetching pantry items");
  },

  /**
   * Add a new pantry item
   */
  async addPantryItem(
    item: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): Promise<PantryItem> {
    return withErrorLogging(() => addPantryItemCore(item), "Error adding pantry item");
  },

  /**
   * Result-based variant of addPantryItem.
   */
  async addPantryItemResult(
    item: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ): Promise<AppResult<PantryItem, AppError>> {
    return logAndWrapResult(() => addPantryItemCore(item), "Error adding pantry item");
  },

  /**
   * Add an array of new pantry items with base ingredient metadata
   * If an ingredient already exists, updates its image and quantity instead
   */
  async addPantryItemsWithMetadata(
    items: Omit<PantryItem, "id" | "created_at" | "updated_at">[]
  ): Promise<PantryItem[]> {
    const existingStocks = await databaseFacade.getAllStock();
    const stockMapByLowerName = new Map(existingStocks.map((s) => [s.name.toLowerCase(), s]));

    const categoryCollection = database.collections.get("ingredient_category");
    const existingCategories = await categoryCollection.query().fetch();
    const categoryMapByName = new Map(
      (existingCategories as IngredientCategory[]).map((c) => [c.name, c])
    );

    // Pre-aggregate input items to prevent calling prepareUpdate/prepareCreate multiple times
    // for the same ingredient in the same batch, which causes WatermelonDB to throw an Invariant Violation.
    const aggregatedItems = new Map<string, Omit<PantryItem, "id" | "created_at" | "updated_at">>();
    for (const item of items) {
      const lowerName = item.name.toLowerCase();
      const existing = aggregatedItems.get(lowerName);
      if (existing) {
        existing.quantity += item.quantity;
        if (item.image_url) existing.image_url = item.image_url;
        if (item.unit) existing.unit = item.unit;
        if (item.expiry_date) existing.expiry_date = item.expiry_date;
        if (item.type) existing.type = item.type;
        if (item.background_color) existing.background_color = item.background_color;

        // Merge categories
        if (item.categories) {
          existing.categories = [...(existing.categories || []), ...item.categories];
          // Deduplicate by name
          const seen = new Set<string>();
          existing.categories = existing.categories.filter((c) => {
            if (seen.has(c.name)) return false;
            seen.add(c.name);
            return true;
          });
        }

        // Merge synonyms
        if (item.synonyms) {
          existing.synonyms = [...(existing.synonyms || []), ...item.synonyms];
          // Deduplicate by synonym string
          const seen = new Set<string>();
          existing.synonyms = existing.synonyms.filter((s) => {
            const lowerSyn = s.synonym.toLowerCase();
            if (seen.has(lowerSyn)) return false;
            seen.add(lowerSyn);
            return true;
          });
        }
      } else {
        aggregatedItems.set(lowerName, { ...item }); // clone to avoid mutating input directly if nested
      }
    }

    const uniqueItems = Array.from(aggregatedItems.values());

    const createdOrUpdatedStockRefs: Stock[] = [];
    const batchOps: Model[] = [];

    await database.write(async () => {
      const stockCollection = database.collections.get("stock");
      const synonymCollection = database.collections.get("ingredient_synonym");
      const stockCategoryCollection = database.collections.get("stock_category");

      for (const item of uniqueItems) {
        try {
          const existingStock = stockMapByLowerName.get(item.name.toLowerCase());

          let stockItem: Stock;

          if (existingStock) {
            const op = existingStock.prepareUpdate((stock) => {
              (stock as Stock).quantity = existingStock.quantity + item.quantity;
              if (typeof item.image_url === "string") {
                (stock as Stock).imageUrl = item.image_url;
              }
              if (item.unit) (stock as Stock).unit = item.unit;
              if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
            });
            batchOps.push(op);
            stockItem = existingStock;
          } else {
            stockItem = stockCollection.prepareCreate((stock) => {
              (stock as Stock).name = item.name;
              (stock as Stock).quantity = item.quantity;
              (stock as Stock).unit = item.unit;
              if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
              if (item.type) (stock as Stock).storageType = item.type;
              if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
              if (typeof item.image_url === "string") (stock as Stock).imageUrl = item.image_url;
            }) as Stock;
            batchOps.push(stockItem);
            stockMapByLowerName.set(item.name.toLowerCase(), stockItem);
          }

          if (!existingStock && item.categories && item.categories.length > 0) {
            for (const category of item.categories) {
              let categoryRecord = categoryMapByName.get(category.name);
              if (!categoryRecord) {
                categoryRecord = categoryCollection.prepareCreate((cat) => {
                  (cat as IngredientCategory).name = category.name;
                  (cat as IngredientCategory).syncedAt = Date.now();
                }) as IngredientCategory;
                batchOps.push(categoryRecord);
                categoryMapByName.set(category.name, categoryRecord);
              }
              const scOp = stockCategoryCollection.prepareCreate((sc) => {
                (sc as StockCategory).stockId = stockItem.id;
                (sc as StockCategory).categoryId = categoryRecord!.id;
              });
              batchOps.push(scOp);
            }
          }

          if (!existingStock && item.synonyms && item.synonyms.length > 0) {
            for (const synonym of item.synonyms) {
              const synOp = synonymCollection.prepareCreate((syn) => {
                (syn as IngredientSynonym).stockId = stockItem.id;
                (syn as IngredientSynonym).synonym = synonym.synonym.toLowerCase();
              });
              batchOps.push(synOp);
            }
          }

          createdOrUpdatedStockRefs.push(stockItem);
        } catch (error) {
          log.error(`Failed to add/update pantry item ${item.name}:`, error);
        }
      }

      if (batchOps.length > 0) {
        await database.batch(batchOps);
      }
    });

    const batchSize = 10;
    const createdItems: PantryItem[] = [];
    for (let i = 0; i < createdOrUpdatedStockRefs.length; i += batchSize) {
      const batch = createdOrUpdatedStockRefs.slice(i, i + batchSize);
      const converted = await convertStockToPantryItemBatch(batch);
      createdItems.push(...converted);
    }
    log.info("addPantryItemsWithMetadata: created/updated", createdItems.length, "items");
    return createdItems;
  },

  /**
   * Add an array of new pantry items
   */
  async addPantryItems(
    items: Omit<PantryItem, "id" | "created_at" | "updated_at">[]
  ): Promise<PantryItem[]> {
    const createdItems: PantryItem[] = [];
    const stockCollection = database.collections.get("stock");
    const stockRecordsToCreate: Stock[] = [];

    // Prepare all stock items directly in memory
    for (const item of items) {
      try {
        const preparedStock = stockCollection.prepareCreate((stock) => {
          (stock as Stock).name = item.name;
          (stock as Stock).quantity = item.quantity;
          (stock as Stock).unit = item.unit;
          if (item.expiry_date) (stock as Stock).expiryDate = item.expiry_date;
          if (item.type) (stock as Stock).storageType = item.type;
          if (item.background_color) (stock as Stock).backgroundColor = item.background_color;
          if (typeof item.image_url === "string") (stock as Stock).imageUrl = item.image_url;
        });
        stockRecordsToCreate.push(preparedStock as Stock);
      } catch (error) {
        log.error(`Failed to prepare pantry item ${item.name}:`, error);
        // Continue with other items instead of failing completely
      }
    }

    // Process all items in a single transaction
    if (stockRecordsToCreate.length > 0) {
      try {
        await database.write(async () => {
          await database.batch(stockRecordsToCreate);
        });

        // After batch insert is successful, convert to PantryItem
        const convertedBatch = await convertStockToPantryItemBatch(stockRecordsToCreate);
        createdItems.push(...convertedBatch);
      } catch (batchError) {
        log.error("Failed to execute batch insert for pantry items:", batchError);
      }
    }

    return createdItems;
  },

  /**
   * Update an existing pantry item
   */
  async updatePantryItem(id: string, updates: Partial<PantryItem>): Promise<PantryItem> {
    return withErrorLogging(() => updatePantryItemCore(id, updates), "Error updating pantry item");
  },

  /**
   * Result-based variant of updatePantryItem.
   */
  async updatePantryItemResult(
    id: string,
    updates: Partial<PantryItem>
  ): Promise<AppResult<PantryItem, AppError>> {
    return logAndWrapResult(() => updatePantryItemCore(id, updates), "Error updating pantry item");
  },

  /**
   * Delete a pantry item
   */
  async deletePantryItem(id: string): Promise<void> {
    await databaseFacade.deleteStock(id);
  },

  /**
   * Result-based variant of deletePantryItem.
   */
  async deletePantryItemResult(id: string): Promise<AppResult<void, AppError>> {
    return wrapResult(async () => {
      await databaseFacade.deleteStock(id);
    });
  },

  /**
   * Get pantry items by type
   */
  async getPantryItemsByType(type: Exclude<ItemType, "all">): Promise<PantryItem[]> {
    // ⚡ Bolt Performance Optimization: Filter raw stocks first to avoid expensive Batch Entity fetching for excluded types
    const rawStocks = await databaseFacade.getAllStock();
    const dbTypeMatches = (dbType: string | undefined, expectedType: ItemType) => {
      return mapDbTypeToType(dbType) === expectedType;
    };
    const filteredStocks = rawStocks.filter((stock) => dbTypeMatches(stock.storageType, type));
    return await convertStockToPantryItemBatch(filteredStocks);
  },

  /**
   * Search pantry items by name
   */
  async searchPantryItems(query: string): Promise<PantryItem[]> {
    // ⚡ Bolt Performance Optimization: Push search to DB layer rather than fetching all and filtering in-memory
    const matchingStocks = await databaseFacade.searchStock(query);
    return await convertStockToPantryItemBatch(matchingStocks);
  },

  /**
   * Get expiring items
   */
  async getExpiringItems(days: number = 3): Promise<PantryItem[]> {
    // ⚡ Bolt Performance Optimization: Push date filtering to DB layer rather than fetching all and filtering in-memory
    const expiringStocks = await databaseFacade.getExpiringStock(days);
    return await convertStockToPantryItemBatch(expiringStocks);
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Helper function to convert Stock + BaseIngredient to PantryItem in batches
const convertStockToPantryItemBatch = async (stocks: Stock[]): Promise<PantryItem[]> => {
  if (stocks.length === 0) return [];

  const stockIds = stocks.map((s) => s.id);

  // Fetch all related entities in parallel
  const synonymCollection = database.collections.get<IngredientSynonym>("ingredient_synonym");
  const stockCategoryCollection = database.collections.get<StockCategory>("stock_category");
  const stepsCollection = database.collections.get<StepsToStore>("steps_to_store");

  let allSynonyms: IngredientSynonym[] = [];
  let allStockCategories: StockCategory[] = [];
  let allSteps: StepsToStore[] = [];

  try {
    const [synonymsResult, categoriesResult, stepsResult] = await Promise.all([
      Promise.race([
        synonymCollection.query(Q.where("stock_id", Q.oneOf(stockIds))).fetch(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Synonym fetch timeout")), 5000)
        ),
      ]).catch((e) => {
        log.warn("Batch synonym fetch failed", e);
        return [];
      }),
      Promise.race([
        stockCategoryCollection.query(Q.where("stock_id", Q.oneOf(stockIds))).fetch(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Categories fetch timeout")), 5000)
        ),
      ]).catch((e) => {
        log.warn("Batch category fetch failed", e);
        return [];
      }),
      Promise.race([
        stepsCollection.query(Q.where("stock_id", Q.oneOf(stockIds))).fetch(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Steps fetch timeout")), 5000)
        ),
      ]).catch((e) => {
        log.warn("Batch steps fetch failed", e);
        return [];
      }),
    ]);

    allSynonyms = synonymsResult as IngredientSynonym[];
    allStockCategories = categoriesResult as StockCategory[];
    allSteps = stepsResult as StepsToStore[];
  } catch (error) {
    log.error("Error fetching batch relations", error);
  }

  // Resolve IngredientCategories if needed
  const categoryIds = new Set<string>();

  allStockCategories.forEach((sc) => {
    if (sc.categoryId) {
      categoryIds.add(sc.categoryId);
    }
  });

  const categoryCollection = database.collections.get<IngredientCategory>("ingredient_category");
  let allIngredientCategories: IngredientCategory[] = [];
  if (categoryIds.size > 0) {
    try {
      allIngredientCategories = (await Promise.race([
        categoryCollection.query(Q.where("id", Q.oneOf(Array.from(categoryIds)))).fetch(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("IngredientCategory fetch timeout")), 5000)
        ),
      ])) as IngredientCategory[];
    } catch (error) {
      log.warn("Batch IngredientCategory fetch failed", error);
    }
  }

  const ingredientCategoryMap = new Map<string, IngredientCategory>();
  allIngredientCategories.forEach((c) => ingredientCategoryMap.set(c.id, c));

  // Group by stock_id
  const synonymsByStockId = new Map<string, Array<{ id: string; synonym: string }>>();
  const categoriesByStockId = new Map<string, Array<{ id: string; name: string }>>();
  const stepsByStockId = new Map<
    string,
    Array<{ id: string; title: string; description: string; sequence: number }>
  >();

  allSynonyms.forEach((s) => {
    const list = synonymsByStockId.get(s.stockId) || [];
    list.push({ id: s.id, synonym: s.synonym });
    synonymsByStockId.set(s.stockId, list);
  });

  allStockCategories.forEach((sc) => {
    const list = categoriesByStockId.get(sc.stockId) || [];
    const ingredientCat = ingredientCategoryMap.get(sc.categoryId);
    if (ingredientCat) {
      list.push({ id: ingredientCat.id, name: ingredientCat.name });
    }
    categoriesByStockId.set(sc.stockId, list);
  });

  allSteps.forEach((s) => {
    const stockId = s.stockId;
    const list = stepsByStockId.get(stockId) || [];
    list.push({
      id: s.id,
      title: s.title,
      description: s.description,
      sequence: s.sequence,
    });
    stepsByStockId.set(stockId, list);
  });

  // Pre-fetch missing categories to avoid N+1 query problem
  const stocksMissingCategories = stocks.filter((stock) => {
    const categories = categoriesByStockId.get(stock.id) || [];
    return categories.length === 0;
  });

  const missingCategoriesMap = new Map<string, Array<{ id: string; name: string }>>();
  if (stocksMissingCategories.length > 0) {
    try {
      const namesToFetch = stocksMissingCategories.map((s) => s.name);
      // Ensure we use a batch fetch method avoiding N+1 requests over the network!
      const baseIngredientsMap = await baseIngredientApi.getBaseIngredientsByNames(namesToFetch);

      stocksMissingCategories.forEach((stock) => {
        const baseIngredient = baseIngredientsMap.get(stock.name.toLowerCase());
        if (baseIngredient?.categories?.length) {
          missingCategoriesMap.set(stock.id, baseIngredient.categories);
        }
      });
    } catch (error) {
      log.error("Error batch fetching base ingredient categories:", error);
    }
  }

  // Use simple map instead of Promise.all with async map since all data is pre-fetched
  return stocks.map((stock) => {
    const synonyms = synonymsByStockId.get(stock.id) || [];
    let categories = categoriesByStockId.get(stock.id) || [];
    const stepsToStore = stepsByStockId.get(stock.id) || [];
    stepsToStore.sort((a, b) => a.sequence - b.sequence);

    // Fallback: if no local categories, try using pre-fetched from BaseIngredient
    if (categories.length === 0) {
      const fetchedCategories = missingCategoriesMap.get(stock.id);
      if (fetchedCategories?.length) {
        categories = fetchedCategories;
      }
    }

    return {
      id: stock.id,
      name: stock.name,
      quantity: stock.quantity,
      unit: stock.unit,
      expiry_date: stock.expiryDate || undefined,
      category: categories.length > 0 ? categories[0]?.name || "" : "",
      categories,
      type: mapDbTypeToType(stock.storageType),
      image_url: stock.imageUrl,
      background_color: stock.backgroundColor,
      created_at: stock.createdAt,
      updated_at: stock.updatedAt,
      steps_to_store: stepsToStore,
      synonyms,
    };
  });
};

// Map database dbType to ItemType
const mapDbTypeToType = (type?: string): Exclude<ItemType, "all"> => {
  if (!type) return "fridge";
  const lowerDbType = type.toLowerCase();
  if (lowerDbType.includes("cabinet") || lowerDbType.includes("pantry")) return "cabinet";
  if (lowerDbType.includes("freezer")) return "freezer";
  return "fridge"; // default
};
