import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Stock from "./Stock";

export interface WasteLogData {
  stockId: string;
  quantityWasted: number;
  reason?: string;
  wasteDate: number;
  estimatedCost?: number;
}

export default class WasteLog extends Model {
  static table = "waste_log";
  static associations: Associations = {
    stock: { type: "belongs_to", key: "stock_id" },
  };

  @field("stock_id") stockId!: string;
  @field("quantity_wasted") quantityWasted!: number; // Amount wasted
  @field("reason") reason?: string; // Reason: expired, spoiled, excess, accidental
  @field("waste_date") wasteDate!: number; // Timestamp when wasted
  @field("estimated_cost") estimatedCost?: number; // Money lost (in cents)

  @relation("stock", "stock_id") stock!: Stock;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for waste date
  get wasteDateDate(): Date {
    return new Date(this.wasteDate);
  }

  // Check if has cost estimate
  get hasEstimatedCost(): boolean {
    return this.estimatedCost !== undefined && this.estimatedCost > 0;
  }

  // Check if has reason
  get hasReason(): boolean {
    return !!this.reason && this.reason.trim().length > 0;
  }

  // Format waste date for display
  get formattedWasteDate(): string {
    const date = this.wasteDateDate;
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

  // Format cost for display (convert cents to dollars)
  get formattedCost(): string {
    if (!this.hasEstimatedCost) return "N/A";
    const dollars = this.estimatedCost! / 100;
    return `$${dollars.toFixed(2)}`;
  }

  // Update method
  @writer async updateWasteLog(data: Partial<WasteLogData>): Promise<WasteLog> {
    return this.update((record) => {
      if (data.stockId !== undefined) record.stockId = data.stockId;
      if (data.quantityWasted !== undefined) record.quantityWasted = data.quantityWasted;
      if (data.reason !== undefined) record.reason = data.reason;
      if (data.wasteDate !== undefined) record.wasteDate = data.wasteDate;
      if (data.estimatedCost !== undefined) record.estimatedCost = data.estimatedCost;
    });
  }
}
