import { Q } from "@nozbe/watermelondb";
import IngredientCategory from "../models/IngredientCategory";
import { BaseRepository, type SearchOptions } from "./BaseRepository";

export class IngredientCategoryRepository extends BaseRepository<IngredientCategory> {
  constructor() {
    super("ingredient_category");
  }

  // Find category by name
  async findByName(name: string): Promise<IngredientCategory | undefined> {
    const results = await this.collection.query(Q.where("name", Q.eq(name))).fetch();
    return results[0];
  }

  // Get or create category by name
  async getOrCreate(name: string): Promise<IngredientCategory> {
    const existing = await this.findByName(name);
    if (existing) {
      return existing;
    }

    return await this.create({
      name,
    });
  }

  // Search categories
  async searchCategories(options: SearchOptions = {}): Promise<IngredientCategory[]> {
    let query = this.collection.query();

    if (options.searchTerm) {
      query = this.buildSearchQuery(query, options.searchTerm, ["name"]);
    }

    query = this.applySorting(query, options.sortBy || "name", options.sortOrder || "asc");

    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    return await query.fetch();
  }

  // Get all category names
  async getAllCategoryNames(): Promise<string[]> {
    const categories = await this.findAll();
    return categories.map((cat) => cat.name).sort();
  }

  // Sync categories from Supabase
  async syncFromSupabase(categories: Array<{ id: string; name: string }>): Promise<void> {
    if (categories.length === 0) return;

    const db = this.collection.database;

    await db.write(async () => {
      // ⚡ Bolt Performance Optimization:
      // Replaced N+1 individual .findByName() queries inside the loop with a single batch fetch using Q.oneOf().
      // This is inside the write block to maintain transaction atomicity and prevent race conditions.
      const categoryNames = categories.map((c) => c.name);

      // Fetch all existing categories matching the incoming names in a single query
      const existingCategories = await this.collection
        .query(Q.where("name", Q.oneOf(categoryNames)))
        .fetch();

      const existingNames = new Set(existingCategories.map((c) => c.name));

      // Deduplicate the incoming payload to prevent multiple creations of the same category
      // which would result in SQLite UNIQUE constraint failures
      const uniqueNewCategoriesMap = new Map<string, { id: string; name: string }>();

      for (const c of categories) {
        if (!existingNames.has(c.name) && !uniqueNewCategoriesMap.has(c.name)) {
          uniqueNewCategoriesMap.set(c.name, c);
        }
      }

      const newCategoriesToCreate = Array.from(uniqueNewCategoriesMap.values());

      if (newCategoriesToCreate.length === 0) return;

      const batchOps = newCategoriesToCreate.map((catData) =>
        this.collection.prepareCreate((category: any) => {
          category._raw.id = catData.id; // Preserve Supabase ID
          category.name = catData.name;
          category.syncedAt = Date.now();
        })
      );

      await db.batch(batchOps);
    });
  }
}
