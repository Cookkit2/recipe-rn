import { Q } from "@nozbe/watermelondb";
import MealPlanTemplate, { type MealPlanTemplateData } from "../models/MealPlanTemplate";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface MealPlanTemplateSearchOptions extends SearchOptions {}

export class MealPlanTemplateRepository extends BaseRepository<MealPlanTemplate> {
  constructor() {
    super("meal_plan_template");
  }

  // Create a new meal plan template
  async createTemplate(data: MealPlanTemplateData): Promise<MealPlanTemplate> {
    if (!data.name) {
      throw new Error("Cannot create template: name is missing");
    }

    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.name = data.name;
        record.description = data.description ?? "";
        record.mealSlots = data.mealSlots ?? "[]";
      });
    });
  }

  // Get all meal plan templates
  async getAllTemplates(options: MealPlanTemplateSearchOptions = {}): Promise<MealPlanTemplate[]> {
    let query = this.collection.query();

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

  // Get template by name
  async getByName(name: string): Promise<MealPlanTemplate | null> {
    if (!name) return null;
    const records = await this.collection.query(Q.where("name", name), Q.take(1)).fetch();
    return records.length > 0 ? (records[0] ?? null) : null;
  }

  // Update template
  async updateTemplate(
    id: string,
    data: Partial<MealPlanTemplateData>
  ): Promise<MealPlanTemplate | null> {
    const record = await this.findById(id);
    if (!record) return null;

    await database.write(async () => {
      await (record as MealPlanTemplate).updateMealPlanTemplate(data);
    });

    return record as MealPlanTemplate;
  }

  // Delete a template
  async deleteTemplate(id: string): Promise<boolean> {
    const record = await this.findById(id);
    if (!record) return false;

    try {
      await this.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  // Get count of templates
  async getTemplateCount(): Promise<number> {
    return await this.collection.query().fetchCount();
  }

  // Search templates by name or description
  async searchTemplates(searchTerm: string): Promise<MealPlanTemplate[]> {
    if (!searchTerm?.trim()) {
      return await this.findAll();
    }

    const query = this.buildSearchQuery(
      this.collection.query(),
      searchTerm,
      ["name", "description"]
    );

    return await query.fetch();
  }
}
