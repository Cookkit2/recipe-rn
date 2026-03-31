import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Stock from "./Stock";
import Recipe from "./Recipe";

export interface ConsumptionLogData {
  stockId: string;
  quantityConsumed: number;
  recipeId?: string;
  consumedDate: number;
  isBeforeExpiry: boolean;
}

export default class ConsumptionLog extends Model {
  static table = "consumption_log";
  static associations: Associations = {
    stock: { type: "belongs_to", key: "stock_id" },
    recipe: { type: "belongs_to", key: "recipe_id" },
  };

  @field("stock_id") stockId!: string;
  @field("quantity_consumed") quantityConsumed!: number; // Amount consumed
  @field("recipe_id") recipeId?: string; // Recipe used for, if applicable
  @field("consumed_date") consumedDate!: number; // Timestamp when consumed
  @field("is_before_expiry") isBeforeExpiry!: boolean; // Whether consumed before expiry

  @relation("stock", "stock_id") stock!: Stock;
  @relation("recipe", "recipe_id") recipe?: Recipe;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for consumption date
  get consumedDateDate(): Date {
    return new Date(this.consumedDate);
  }

  // Format consumed date for display
  get formattedConsumedDate(): string {
    const date = this.consumedDateDate;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? "s" : ""} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }

  // Update method
  @writer async updateConsumptionLog(data: Partial<ConsumptionLogData>): Promise<ConsumptionLog> {
    return this.update((record) => {
      if (data.stockId !== undefined) record.stockId = data.stockId;
      if (data.quantityConsumed !== undefined) record.quantityConsumed = data.quantityConsumed;
      if (data.recipeId !== undefined) record.recipeId = data.recipeId;
      if (data.consumedDate !== undefined) record.consumedDate = data.consumedDate;
      if (data.isBeforeExpiry !== undefined) record.isBeforeExpiry = data.isBeforeExpiry;
    });
  }
}
