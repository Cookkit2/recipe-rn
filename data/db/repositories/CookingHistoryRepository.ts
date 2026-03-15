import { Q } from "@nozbe/watermelondb";
import CookingHistory, { type CookingHistoryData } from "../models/CookingHistory";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface CookingHistorySearchOptions extends SearchOptions {
  recipeId?: string;
  hasRating?: boolean;
  hasPhoto?: boolean;
  minRating?: number;
}

export class CookingHistoryRepository extends BaseRepository<CookingHistory> {
  constructor() {
    super("cooking_history");
  }

  // Record a new cooking session
  async recordCooking(
    recipeId: string,
    data?: Partial<CookingHistoryData>
  ): Promise<CookingHistory> {
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.recipeId = recipeId;
        record.cookedAt = data?.cookedAt ?? Date.now();
        if (data?.rating !== undefined) record.rating = data.rating;
        if (data?.notes) record.notes = data.notes;
        if (data?.servingsMade !== undefined) record.servingsMade = data.servingsMade;
        if (data?.photoUrl) record.photoUrl = data.photoUrl;
      });
    });
  }

  // Get cooking history with optional filters
  async getCookingHistory(options: CookingHistorySearchOptions = {}): Promise<CookingHistory[]> {
    let query = this.collection.query();

    // Filter by recipe
    if (options.recipeId) {
      query = query.extend(Q.where("recipe_id", options.recipeId));
    }

    // Filter by rating
    if (options.minRating !== undefined) {
      query = query.extend(Q.where("rating", Q.gte(options.minRating)));
    }

    // Apply sorting (most recent first by default)
    query = this.applySorting(query, options.sortBy || "cooked_at", options.sortOrder || "desc");

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    let records = await query.fetch();

    // Post-process filters that can't be done in SQL
    if (options.hasRating === true) {
      records = records.filter((r) => r.rating !== undefined);
    } else if (options.hasRating === false) {
      records = records.filter((r) => r.rating === undefined);
    }

    if (options.hasPhoto === true) {
      records = records.filter((r) => r.hasPhoto);
    } else if (options.hasPhoto === false) {
      records = records.filter((r) => !r.hasPhoto);
    }

    return records;
  }

  // Get recently cooked recipes (unique recipes)
  async getRecentlyCookedRecipes(limit: number = 10): Promise<
    {
      recipeId: string;
      lastCookedAt: number;
      cookCount: number;
    }[]
  > {
    const allHistory = await this.collection.query(Q.sortBy("cooked_at", Q.desc)).fetch();

    // Group by recipe and get unique recipes
    const recipeMap = new Map<string, { lastCookedAt: number; cookCount: number }>();

    for (const record of allHistory) {
      const existing = recipeMap.get(record.recipeId);
      if (existing) {
        existing.cookCount++;
      } else {
        recipeMap.set(record.recipeId, {
          lastCookedAt: record.cookedAt,
          cookCount: 1,
        });
      }
    }

    // Convert to array and sort by last cooked
    return Array.from(recipeMap.entries())
      .map(([recipeId, data]) => ({
        recipeId,
        lastCookedAt: data.lastCookedAt,
        cookCount: data.cookCount,
      }))
      .sort((a, b) => b.lastCookedAt - a.lastCookedAt)
      .slice(0, limit);
  }

  // Get most cooked recipes
  async getMostCookedRecipes(limit: number = 10): Promise<
    {
      recipeId: string;
      cookCount: number;
      lastCookedAt: number;
    }[]
  > {
    const allHistory = await this.collection.query().fetch();

    // Group by recipe and count
    const recipeMap = new Map<string, { cookCount: number; lastCookedAt: number }>();

    for (const record of allHistory) {
      const existing = recipeMap.get(record.recipeId);
      if (existing) {
        existing.cookCount++;
        if (record.cookedAt > existing.lastCookedAt) {
          existing.lastCookedAt = record.cookedAt;
        }
      } else {
        recipeMap.set(record.recipeId, {
          cookCount: 1,
          lastCookedAt: record.cookedAt,
        });
      }
    }

    // Convert to array and sort by cook count
    return Array.from(recipeMap.entries())
      .map(([recipeId, data]) => ({
        recipeId,
        cookCount: data.cookCount,
        lastCookedAt: data.lastCookedAt,
      }))
      .sort((a, b) => b.cookCount - a.cookCount)
      .slice(0, limit);
  }

  // Get cook count for a specific recipe
  async getRecipeCookCount(recipeId: string): Promise<number> {
    const count = await this.collection.query(Q.where("recipe_id", recipeId)).fetchCount();
    return count;
  }

  // Get last cooked date for a recipe
  async getLastCookedDate(recipeId: string): Promise<Date | null> {
    const records = await this.collection
      .query(Q.where("recipe_id", recipeId), Q.sortBy("cooked_at", Q.desc), Q.take(1))
      .fetch();

    return records.length > 0 && records[0] ? records[0].cookedAtDate : null;
  }

  // Get average rating for a recipe
  async getAverageRating(recipeId: string): Promise<number | null> {
    const records = await this.collection.query(Q.where("recipe_id", recipeId)).fetch();

    const ratingsWithValues = records.filter((r) => r.rating !== undefined);

    if (ratingsWithValues.length === 0) return null;

    const sum = ratingsWithValues.reduce((acc, r) => acc + (r.rating || 0), 0);
    return sum / ratingsWithValues.length;
  }

  // Update a cooking history record
  async updateCookingRecord(
    id: string,
    data: Partial<CookingHistoryData>
  ): Promise<CookingHistory | null> {
    const record = await this.findById(id);
    if (!record) return null;

    await database.write(async () => {
      await record.updateCookingHistory(data);
    });

    return record;
  }

  // Delete a cooking history record
  async deleteCookingRecord(id: string): Promise<boolean> {
    try {
      await this.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  // Get cooking statistics
  async getCookingStats(): Promise<{
    totalCooks: number;
    uniqueRecipes: number;
    averageRating: number | null;
    photosCount: number;
  }> {
    const allRecords = await this.findAll();

    const uniqueRecipes = new Set(allRecords.map((r) => r.recipeId)).size;
    const photosCount = allRecords.filter((r) => r.hasPhoto).length;

    const recordsWithRating = allRecords.filter((r) => r.hasValidRating);
    const averageRating =
      recordsWithRating.length > 0
        ? recordsWithRating.reduce((acc, r) => acc + (r.rating || 0), 0) / recordsWithRating.length
        : null;

    return {
      totalCooks: allRecords.length,
      uniqueRecipes,
      averageRating,
      photosCount,
    };
  }
}
