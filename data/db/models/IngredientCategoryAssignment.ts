import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import BaseIngredient from "./BaseIngredient";
import IngredientCategory from "./IngredientCategory";

export interface IngredientCategoryAssignmentData {
  ingredientId: string;
  categoryId: string;
}

export default class IngredientCategoryAssignment extends Model {
  static table = "ingredient_category_assignments";
  static associations: Associations = {
    base_ingredients: { type: "belongs_to", key: "ingredient_id" },
    ingredient_categories: { type: "belongs_to", key: "category_id" },
  };

  @field("ingredient_id") ingredientId!: string;
  @field("category_id") categoryId!: string;

  @relation("base_ingredients", "ingredient_id") ingredient!: BaseIngredient;
  @relation("ingredient_categories", "category_id")
  category!: IngredientCategory;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateAssignment(
    data: Partial<IngredientCategoryAssignmentData>
  ): Promise<IngredientCategoryAssignment> {
    return this.update((assignment) => {
      if (data.ingredientId !== undefined)
        assignment.ingredientId = data.ingredientId;
      if (data.categoryId !== undefined)
        assignment.categoryId = data.categoryId;
    });
  }
}
