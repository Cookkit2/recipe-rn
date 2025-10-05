import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Recipe from "./Recipe";

export interface RecipeIngredientData {
  recipeId: string;
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export default class RecipeIngredient extends Model {
  static table = "recipe_ingredient";
  static associations: Associations = {
    recipe: { type: "belongs_to", key: "recipe_id" },
  };

  @field("recipe_id") recipeId!: string;
  @field("name") name!: string; // Display name for this recipe context
  @field("quantity") quantity!: number;
  @field("unit") unit!: string;
  @field("notes") notes?: string;

  @relation("recipe", "recipe_id") recipe!: Recipe;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateRecipeIngredient(
    data: Partial<RecipeIngredientData>
  ): Promise<RecipeIngredient> {
    return this.update((ingredient) => {
      if (data.recipeId !== undefined) ingredient.recipeId = data.recipeId;
      if (data.name !== undefined) ingredient.name = data.name;
      if (data.quantity !== undefined) ingredient.quantity = data.quantity;
      if (data.unit !== undefined) ingredient.unit = data.unit;
      if (data.notes !== undefined) ingredient.notes = data.notes;
    });
  }
}
