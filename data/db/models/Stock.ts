import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import BaseIngredient from "./BaseIngredient";

export interface StockData {
  baseIngredientId: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: Date;
  category?: string;
  imageUrl?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export default class Stock extends Model {
  static table = "stock";
  static associations: Associations = {
    base_ingredients: { type: "belongs_to", key: "base_ingredient_id" },
  };

  @field("base_ingredient_id") baseIngredientId!: string;
  @field("name") name!: string;
  @field("quantity") quantity!: number;
  @field("unit") unit!: string;
  @field("expiry_date") _expiryDate?: number; // timestamp
  @field("category") category?: string;
  @field("image_url") imageUrl?: string;
  @field("x") x?: number;
  @field("y") y?: number;
  @field("scale") scale?: number;

  @relation("base_ingredients", "base_ingredient_id")
  baseIngredient!: BaseIngredient;

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
      if (data.baseIngredientId !== undefined)
        stock.baseIngredientId = data.baseIngredientId;
      if (data.name !== undefined) stock.name = data.name;
      if (data.quantity !== undefined) stock.quantity = data.quantity;
      if (data.unit !== undefined) stock.unit = data.unit;
      if (data.expiryDate !== undefined) stock.expiryDate = data.expiryDate;
      if (data.category !== undefined) stock.category = data.category;
      if (data.imageUrl !== undefined) stock.imageUrl = data.imageUrl;
      if (data.x !== undefined) stock.x = data.x;
      if (data.y !== undefined) stock.y = data.y;
      if (data.scale !== undefined) stock.scale = data.scale;
    });
  }
}
