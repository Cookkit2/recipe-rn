import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Recipe from "./Recipe";
import BaseIngredient from "./BaseIngredient";

export interface RecipeIngredientData {
  recipeId: string;
  baseIngredientId: string;
  name: string;
  quantity: string;
  notes?: string;
}

export default class RecipeIngredient extends Model {
  static table = "recipe_ingredients";
  static associations: Associations = {
    recipes: { type: "belongs_to", key: "recipe_id" },
    base_ingredients: { type: "belongs_to", key: "base_ingredient_id" },
  };

  @field("recipe_id") recipeId!: string;
  @field("base_ingredient_id") baseIngredientId!: string;
  @field("name") name!: string; // Display name for this recipe context
  @field("quantity") quantity!: string;
  @field("notes") notes?: string;

  @relation("recipes", "recipe_id") recipe!: Recipe;
  @relation("base_ingredients", "base_ingredient_id")
  baseIngredient!: BaseIngredient;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateRecipeIngredient(
    data: Partial<RecipeIngredientData>
  ): Promise<RecipeIngredient> {
    return this.update((ingredient) => {
      if (data.recipeId !== undefined) ingredient.recipeId = data.recipeId;
      if (data.baseIngredientId !== undefined)
        ingredient.baseIngredientId = data.baseIngredientId;
      if (data.name !== undefined) ingredient.name = data.name;
      if (data.quantity !== undefined) ingredient.quantity = data.quantity;
      if (data.notes !== undefined) ingredient.notes = data.notes;
    });
  }
}
