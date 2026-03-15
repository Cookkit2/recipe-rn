import { Model, type Relation } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type Recipe from "./Recipe";

export interface MealPlanData {
  recipeId: string;
  servings: number;
  date?: Date;
  mealSlot?: string;
  templateId?: string;
}

export default class MealPlan extends Model {
  static table = "meal_plan";
  static associations: Associations = {
    recipe: { type: "belongs_to", key: "recipe_id" },
  };

  @field("recipe_id") recipeId!: string;
  @field("servings") servings!: number;
  @date("date") date!: Date;
  @field("meal_slot") mealSlot!: string;
  @field("template_id") templateId!: string;

  @relation("recipe", "recipe_id") recipe!: Relation<Recipe>;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateMealPlan(data: Partial<MealPlanData>): Promise<MealPlan> {
    return this.update((record) => {
      if (data.recipeId !== undefined) record.recipeId = data.recipeId;
      if (data.servings !== undefined) record.servings = data.servings;
      if (data.date !== undefined) record.date = data.date;
      if (data.mealSlot !== undefined) record.mealSlot = data.mealSlot;
      if (data.templateId !== undefined) record.templateId = data.templateId;
    });
  }
}
