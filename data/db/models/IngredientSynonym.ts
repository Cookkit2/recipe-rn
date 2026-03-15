import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type Stock from "./Stock";

export interface IngredientSynonymData {
  stockId: string;
  synonym: string;
}

export default class IngredientSynonym extends Model {
  static table = "ingredient_synonym";
  static associations: Associations = {
    stock: { type: "belongs_to", key: "stock_id" },
  };

  @field("stock_id") stockId!: string;
  @field("synonym") synonym!: string; // Alternative name for matching

  @relation("stock", "stock_id") stock!: Stock;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Update method
  @writer async updateSynonym(data: Partial<IngredientSynonymData>): Promise<IngredientSynonym> {
    return this.update((syn) => {
      if (data.stockId !== undefined) syn.stockId = data.stockId;
      if (data.synonym !== undefined) syn.synonym = data.synonym;
    });
  }
}
