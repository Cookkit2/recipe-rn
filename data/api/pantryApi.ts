import { Q } from "@nozbe/watermelondb";
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
import {
  resolveBaseIngredientId,
  resolvePantryItemReference,
  prepareStockData,
} from "./api-helpers";
import { persistPantryBatch } from "./pantry-batch";
import { ingredientCatalog } from "~/data/services/ingredientCatalog";

import type { AssistantPantryInput, AssistantPantryResult } from "~/types/AssistantPantryMutation";
import { normalizeIngredientIdentity } from "~/utils/ingredient-identity";
import { createAssistantPantryMutator } from "./assistant-pantry";

const mutateAssistantPantry = createAssistantPantryMutator(database, (name) =>
  ingredientCatalog.resolve(name)
);

// ---------------------------------------------------------------------------
// Core (shared) logic — called by both the throw-based and Result-based public
// methods so the business logic is written only once per operation.
// ---------------------------------------------------------------------------

/** Fetch all pantry items – shared by fetchAllPantryItems & fetchAllPantryItemsResult. */
async function fetchAllPantryItemsCore(): Promise<PantryItem[]> {
  const stockItems = await databaseFacade.getAllStock();

  if (stockItems.length === 0) {
    return [];
  }

  const batchSize = 100;

  // ⚡ Bolt Performance Optimization: Process DB conversion batches concurrently
  // Impact: Eliminates O(N/B) sequential latency, improving large inventory fetch time
  const batchPromises: Promise<PantryItem[]>[] = [];
  for (let i = 0; i < stockItems.length; i += batchSize) {
    const batch = stockItems.slice(i, i + batchSize);
    batchPromises.push(convertStockToPantryItemBatch(batch));
  }

  const results = await Promise.all(batchPromises);
  return results.flat();
}

/** Add a single pantry item – shared by addPantryItem & addPantryItemResult. */
async function addPantryItemCore(
  item: Omit<PantryItem, "id" | "created_at" | "updated_at">
): Promise<PantryItem> {
  log.info("🔍 Adding pantry item:", item);

  const baseIngredientId = await resolvePantryItemReference(item);
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

  const originalName = stock.name;
  const originalReference = stock.baseIngredientId;
  const identityChanged =
    updates.name !== undefined &&
    normalizeIngredientIdentity(updates.name) !== normalizeIngredientIdentity(originalName);
  const baseIngredientId =
    identityChanged ||
    updates.base_ingredient_id === null ||
    (updates.base_ingredient_id !== undefined && updates.base_ingredient_id !== originalReference)
      ? await resolveBaseIngredientId(updates.name ?? originalName, updates.base_ingredient_id)
      : undefined;
  await database.write(async () => {
    if (
      stock.name !== originalName ||
      stock.baseIngredientId !== originalReference ||
      stock._raw._status === "deleted"
    ) {
      throw new Error(
        "This pantry entry changed while its ingredient was being checked. Try the edit again."
      );
    }
    const oldAliases = identityChanged ? await stock.synonyms.fetch() : [];
    await database.batch([
      stock.prepareUpdate((record) => {
        if (baseIngredientId === null) record.clearBaseIngredientReference();
        else if (baseIngredientId !== undefined) record.baseIngredientId = baseIngredientId;
        if (updates.name !== undefined) record.name = updates.name;
        if (updates.quantity !== undefined) record.quantity = updates.quantity;
        if (updates.unit !== undefined) record.unit = updates.unit;
        if (updates.expiry_date !== undefined) record.expiryDate = updates.expiry_date;
        if (updates.type !== undefined) record.storageType = updates.type;
        if (updates.background_color !== undefined)
          record.backgroundColor = updates.background_color;
        if (typeof updates.image_url === "string") record.imageUrl = updates.image_url;
        if (updates.x !== undefined) record.x = updates.x;
        if (updates.y !== undefined) record.y = updates.y;
        if (updates.scale !== undefined) record.scale = updates.scale;
      }),
      ...oldAliases.map((alias) => alias.prepareMarkAsDeleted()),
    ]);
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
  /** Assistant mutations validate and resolve identity atomically before writing stock. */
  async manageAssistantPantry(
    input: AssistantPantryInput
  ): Promise<AssistantPantryResult<PantryItem>> {
    const result = await mutateAssistantPantry(input);
    if (!result.ok) return result;
    if ("removed" in result) {
      return { ...result, removed: await convertStockToPantryItemBatch(result.removed) };
    }
    const [item] = await convertStockToPantryItemBatch([result.item]);
    if (!item) throw new Error("The pantry write did not return an item.");
    return { ...result, item };
  },

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

  /** Optional cloud metadata. Keep this separate from local pantry reads. */
  async fetchIngredientCategories(
    names: string[]
  ): Promise<Record<string, NonNullable<PantryItem["categories"]>>> {
    if (names.length === 0) return {};
    const ingredients = await baseIngredientApi.getBaseIngredientsByNames(names);
    return Object.fromEntries(
      Array.from(ingredients, ([name, ingredient]) => [name.toLowerCase(), ingredient.categories])
    );
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
    return convertStockToPantryItemBatch(await persistPantryBatch(database, items, true));
  },

  /**
   * Add an array of new pantry items
   */
  async addPantryItems(
    items: Omit<PantryItem, "id" | "created_at" | "updated_at">[]
  ): Promise<PantryItem[]> {
    return convertStockToPantryItemBatch(await persistPantryBatch(database, items, false));
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

  // Use simple map instead of Promise.all with async map since all data is pre-fetched
  return stocks.map((stock) => {
    const synonyms = synonymsByStockId.get(stock.id) || [];
    const categories = categoriesByStockId.get(stock.id) || [];
    const stepsToStore = stepsByStockId.get(stock.id) || [];
    stepsToStore.sort((a, b) => a.sequence - b.sequence);

    return {
      id: stock.id,
      name: stock.name,
      base_ingredient_id: stock.baseIngredientId ?? null,
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
