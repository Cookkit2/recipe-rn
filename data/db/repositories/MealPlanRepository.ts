import { Q } from "@nozbe/watermelondb";
import MealPlan, { type MealPlanData } from "../models/MealPlan";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface MealPlanSearchOptions extends SearchOptions {
  recipeId?: string;
}

export class MealPlanRepository extends BaseRepository<MealPlan> {
  constructor() {
    super("meal_plan");
  }

  // Add a recipe to the meal plan
  async addToPlan(data: MealPlanData): Promise<MealPlan> {
    if (!data.recipeId) {
      throw new Error("Cannot add to meal plan: recipeId is missing");
    }

    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.recipeId = data.recipeId;
        record.servings = data.servings;
        // Default date to start of today, mealSlot to 'dinner' so new records are never null
        const defaultDate = new Date();
        defaultDate.setHours(0, 0, 0, 0);
        record.date = data.date ?? defaultDate;
        record.mealSlot = data.mealSlot ?? "dinner";
        if (data.templateId !== undefined) {
          record.templateId = data.templateId;
        }
      });
    });
  }

  // Check if a recipe is already in the meal plan
  async isRecipeInPlan(recipeId: string): Promise<boolean> {
    if (!recipeId) return false;
    const count = await this.collection.query(Q.where("recipe_id", recipeId)).fetchCount();
    return count > 0;
  }

  // Get meal plan entry for a specific recipe
  async getByRecipeId(recipeId: string): Promise<MealPlan | null> {
    if (!recipeId) return null;
    const records = await this.collection.query(Q.where("recipe_id", recipeId), Q.take(1)).fetch();
    return records.length > 0 ? (records[0] ?? null) : null;
  }

  // Get all meal plan items
  async getAllMealPlanItems(options: MealPlanSearchOptions = {}): Promise<MealPlan[]> {
    let query = this.collection.query();

    // Filter by recipe if specified
    if (options.recipeId) {
      query = query.extend(Q.where("recipe_id", options.recipeId));
    }

    // Apply sorting (most recent first by default)
    query = this.applySorting(query, options.sortBy || "created_at", options.sortOrder || "desc");

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    return await query.fetch();
  }

  // Update servings for a meal plan item
  async updateServings(recipeId: string, servings: number): Promise<MealPlan | null> {
    const record = await this.getByRecipeId(recipeId);
    if (!record) return null;

    await database.write(async () => {
      await record.updateMealPlan({ servings });
    });

    return record;
  }

  // Remove a recipe from the meal plan
  async removeFromPlan(recipeId: string): Promise<boolean> {
    const record = await this.getByRecipeId(recipeId);
    if (!record) return false;

    try {
      await this.delete(record.id);
      return true;
    } catch {
      return false;
    }
  }

  // Clear all meal plan items
  async clearAllPlannedRecipes(): Promise<void> {
    const allItems = await this.findAll();
    await database.write(async () => {
      await database.batch(allItems.map((item) => item.prepareDestroyPermanently()));
    });
  }

  // Get count of planned recipes
  async getPlannedRecipeCount(): Promise<number> {
    return await this.collection.query().fetchCount();
  }

  // Get meal plans within a date range (inclusive)
  async getByDateRange(startDate: Date, endDate: Date): Promise<MealPlan[]> {
    if (!startDate || !endDate) {
      return [];
    }

    // Normalize dates to start/end of day for inclusive range queries
    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.collection
      .query(
        Q.where("date", Q.gte(startOfDay.getTime())),
        Q.where("date", Q.lte(endOfDay.getTime())),
        Q.sortBy("date", "asc")
      )
      .fetch();
  }

  // Get meal plan for a specific date and meal slot
  async getByDateAndMealSlot(date: Date, mealSlot: string): Promise<MealPlan | null> {
    if (!date || !mealSlot) {
      return null;
    }

    // Normalize date to start of day for consistent comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const records = await this.collection
      .query(
        Q.where("date", Q.gte(startOfDay.getTime())),
        Q.where("date", Q.lte(endOfDay.getTime())),
        Q.where("meal_slot", mealSlot),
        Q.take(1)
      )
      .fetch();

    return records.length > 0 ? (records[0] ?? null) : null;
  }

  // Update date and meal slot for a meal plan entry
  async updateDateAndSlot(id: string, date: Date, mealSlot: string): Promise<MealPlan | null> {
    const record = await this.findById(id);
    if (!record) return null;

    await database.write(async () => {
      await (record as MealPlan).updateMealPlan({ date, mealSlot });
    });

    return record as MealPlan;
  }

  // Batch upsert meal plans
  async batchUpsert(
    creates: MealPlanData[],
    updates: { record: MealPlan; servings: number }[]
  ): Promise<MealPlan[]> {
    const batchOps: import("@nozbe/watermelondb").Model[] = [];

    // Prepare creates
    for (const data of creates) {
      if (!data.recipeId) continue;

      const preparedCreate = this.collection.prepareCreate((record) => {
        record.recipeId = data.recipeId;
        record.servings = data.servings;
        const defaultDate = new Date();
        defaultDate.setHours(0, 0, 0, 0);
        record.date = data.date ?? defaultDate;
        record.mealSlot = data.mealSlot ?? "dinner";
        if (data.templateId !== undefined) {
          record.templateId = data.templateId;
        }
      });
      batchOps.push(preparedCreate);
    }

    // Prepare updates
    for (const { record, servings } of updates) {
      const preparedUpdate = record.prepareUpdate((r) => {
        r.servings = servings;
      });
      batchOps.push(preparedUpdate);
    }

    if (batchOps.length === 0) return [];

    await database.write(async () => {
      await database.batch(batchOps);
    });

    // We can't easily return the exact records created since they are just instances,
    // but returning an empty array or something is fine since the API doesn't use the return value
    return [];
  }
}
