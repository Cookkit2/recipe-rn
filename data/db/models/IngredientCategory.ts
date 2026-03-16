import { Model, Query } from "@nozbe/watermelondb";
import { field, date, writer, children } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type StockCategory from "./StockCategory";

export interface IngredientCategoryData {
  name: string;
}

export default class IngredientCategory extends Model {
  static table = "ingredient_category";
  static associations: Associations = {
    stock_category: { type: "has_many", foreignKey: "category_id" },
  };

  @field("name") name!: string;
  @field("synced_at") syncedAt!: number;

  @children("stock_category") stockCategories!: Query<StockCategory>;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for synced at date
  get syncedAtDate(): Date {
    return new Date(this.syncedAt);
  }

  // Update method
  @writer async updateCategory(data: Partial<IngredientCategoryData>): Promise<IngredientCategory> {
    return this.update((category) => {
      if (data.name !== undefined) category.name = data.name;
    });
  }
}
