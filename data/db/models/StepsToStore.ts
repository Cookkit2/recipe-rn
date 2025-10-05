import { Model } from "@nozbe/watermelondb";
import { field, date, writer, relation } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type Stock from "./Stock";

export interface StepsToStoreData {
  title: string;
  description: string;
  sequence: number;
  stockId: string;
}

export default class StepsToStore extends Model {
  static table = "steps_to_store";
  static associations: Associations = {
    stock: { type: "belongs_to", key: "stock_id" },
  };

  @field("title") title!: string;
  @field("description") description!: string;
  @field("sequence") sequence!: number;
  @field("stock_id") stockId!: string; // References current stock
  @relation("stock", "stock_id") stock!: Stock;

  @field("synced_at") syncedAt!: number; // NEW: Track sync time

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for synced at date
  get syncedAtDate(): Date {
    return new Date(this.syncedAt);
  }

  // Update method
  @writer async updateStep(
    data: Partial<StepsToStoreData>
  ): Promise<StepsToStore> {
    return this.update((step) => {
      if (data.title !== undefined) step.title = data.title;
      if (data.description !== undefined) step.description = data.description;
      if (data.sequence !== undefined) step.sequence = data.sequence;
      if (data.stockId !== undefined) step.stockId = data.stockId;
    });
  }
}
