import { Model } from "@nozbe/watermelondb";
import { field, date, writer } from "@nozbe/watermelondb/decorators";

export interface MealPlanTemplateData {
  name: string;
  description?: string;
  mealSlots: string; // JSON string of meal slot definitions
}

export default class MealPlanTemplate extends Model {
  static table = "meal_plan_template";

  @field("name") name!: string;
  @field("description") description!: string;
  @field("meal_slots") mealSlots!: string;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateMealPlanTemplate(
    data: Partial<MealPlanTemplateData>
  ): Promise<MealPlanTemplate> {
    return this.update((record) => {
      if (data.name !== undefined) record.name = data.name;
      if (data.description !== undefined) record.description = data.description;
      if (data.mealSlots !== undefined) record.mealSlots = data.mealSlots;
    });
  }
}
