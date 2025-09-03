import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Recipe from "./Recipe";

export interface RecipeStepData {
  step: number;
  title: string;
  description: string;
  recipeId: string;
}

export default class RecipeStep extends Model {
  static table = "recipe_steps";
  static associations: Associations = {
    recipes: { type: "belongs_to", key: "recipe_id" },
  };

  @field("step") step!: number;
  @field("title") title!: string;
  @field("description") description!: string;
  @field("recipe_id") recipeId!: string;

  @relation("recipes", "recipe_id") recipe!: Recipe;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateStep(data: Partial<RecipeStepData>): Promise<RecipeStep> {
    return this.update((step) => {
      if (data.step !== undefined) step.step = data.step;
      if (data.title !== undefined) step.title = data.title;
      if (data.description !== undefined) step.description = data.description;
      if (data.recipeId !== undefined) step.recipeId = data.recipeId;
    });
  }
}
