import { Model } from "@nozbe/watermelondb";
import { field, date, children, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";

export interface IngredientCategoryData {
  name: string;
}

export default class IngredientCategory extends Model {
  static table = "ingredient_categories";
  static associations: Associations = {
    ingredient_category_assignments: {
      type: "has_many",
      foreignKey: "category_id",
    },
  };

  @field("name") name!: string;

  @children("ingredient_category_assignments") ingredientAssignments: any; // Collection<IngredientCategoryAssignment>

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateCategory(
    data: Partial<IngredientCategoryData>
  ): Promise<IngredientCategory> {
    return this.update((category) => {
      if (data.name !== undefined) category.name = data.name;
    });
  }
}
