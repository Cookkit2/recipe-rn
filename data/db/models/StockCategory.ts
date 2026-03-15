import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type Stock from "./Stock";
import type IngredientCategory from "./IngredientCategory";

export interface StockCategoryData {
  stockId: string;
  categoryId: string;
}

export default class StockCategory extends Model {
  static table = "stock_category";
  static associations: Associations = {
    stock: { type: "belongs_to", key: "stock_id" },
    ingredient_category: { type: "belongs_to", key: "category_id" },
  };

  @field("stock_id") stockId!: string;
  @field("category_id") categoryId!: string;

  @relation("stock", "stock_id") stock!: Stock;
  @relation("ingredient_category", "category_id") category!: IngredientCategory;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateStockCategory(data: Partial<StockCategoryData>): Promise<StockCategory> {
    return this.update((sc) => {
      if (data.stockId !== undefined) sc.stockId = data.stockId;
      if (data.categoryId !== undefined) sc.categoryId = data.categoryId;
    });
  }
}
