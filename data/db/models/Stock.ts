import { Model, Collection } from "@nozbe/watermelondb";
import { field, date, writer, children } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type IngredientSynonym from "./IngredientSynonym";
import type StockCategory from "./StockCategory";
import type WasteLog from "./WasteLog";
import type StepsToStore from "./StepsToStore";
import type ConsumptionLog from "./ConsumptionLog";

export interface StockData {
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: Date;
  storageType?: string;
  imageUrl?: string;
  backgroundColor?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export default class Stock extends Model {
  static table = "stock";
  static associations: Associations = {
    steps_to_store: { type: "has_many", foreignKey: "stock_id" },
    ingredient_synonym: { type: "has_many", foreignKey: "stock_id" },
    stock_category: { type: "has_many", foreignKey: "stock_id" },
    waste_log: { type: "has_many", foreignKey: "stock_id" },
    consumption_log: { type: "has_many", foreignKey: "stock_id" },
  };

  @field("name") name!: string;
  @field("quantity") quantity!: number;
  @field("unit") unit!: string;
  @field("expiry_date") _expiryDate?: number; // timestamp
  @field("storage_type") storageType?: string;
  @field("image_url") imageUrl?: string;
  @field("background_color") backgroundColor?: string;
  @field("x") x?: number;
  @field("y") y?: number;
  @field("scale") scale?: number;

  @children("ingredient_synonym") synonyms!: Collection<IngredientSynonym>;
  @children("stock_category") stockCategories!: Collection<StockCategory>;
  @children("waste_log") wasteLogs!: Collection<WasteLog>;
  @children("consumption_log") consumptionLogs!: Collection<ConsumptionLog>;
  @children("steps_to_store") stepsToStore!: Collection<StepsToStore>;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for expiry date
  get expiryDate(): Date | null {
    return this._expiryDate ? new Date(this._expiryDate) : null;
  }

  set expiryDate(value: Date | null) {
    this._expiryDate = value ? value.getTime() : undefined;
  }

  // Check if item is expired
  get isExpired(): boolean {
    if (!this.expiryDate) return false;
    return this.expiryDate < new Date();
  }

  // Check if item is expiring soon (within 3 days)
  get isExpiringSoon(): boolean {
    if (!this.expiryDate) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return this.expiryDate <= threeDaysFromNow && !this.isExpired;
  }

  // Update method
  @writer async updateStock(data: Partial<StockData>): Promise<Stock> {
    return this.update((stock) => {
      if (data.name !== undefined) stock.name = data.name;
      if (data.quantity !== undefined) stock.quantity = data.quantity;
      if (data.unit !== undefined) stock.unit = data.unit;
      if (data.expiryDate !== undefined) stock.expiryDate = data.expiryDate;
      if (data.storageType !== undefined) stock.storageType = data.storageType;
      if (data.imageUrl !== undefined) stock.imageUrl = data.imageUrl;
      if (data.backgroundColor !== undefined) stock.backgroundColor = data.backgroundColor;
      if (data.x !== undefined) stock.x = data.x;
      if (data.y !== undefined) stock.y = data.y;
      if (data.scale !== undefined) stock.scale = data.scale;
    });
  }
}
