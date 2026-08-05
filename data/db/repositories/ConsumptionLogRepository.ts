import { Q } from "@nozbe/watermelondb";
import ConsumptionLog from "../models/ConsumptionLog";
import { BaseRepository } from "./BaseRepository";
import { database } from "../database";

export interface ConsumptionLogSearchOptions {
  stockId?: string;
  recipeId?: string;
  startDate?: number;
  endDate?: number;
  sortBy?: "consumed_date" | "quantity_consumed";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export class ConsumptionLogRepository extends BaseRepository<ConsumptionLog> {
  constructor() {
    super("consumption_log");
  }

  // Record a new consumption log entry
  async recordConsumption(
    stockId: string,
    quantityConsumed: number,
    recipeId?: string,
    consumedDate?: number,
    isBeforeExpiry: boolean = false
  ): Promise<ConsumptionLog> {
    return await database.write(async () => {
      return await this.collection.create((record: any) => {
        record.stockId = stockId;
        record.quantityConsumed = quantityConsumed;
        if (recipeId) record.recipeId = recipeId;
        record.consumedDate = consumedDate ?? Date.now();
        record.isBeforeExpiry = isBeforeExpiry;
      });
    });
  }

  // Get consumption logs with optional filters
  async getConsumptionLogs(options: ConsumptionLogSearchOptions = {}): Promise<ConsumptionLog[]> {
    let query = this.collection.query();

    // Filter by stock item
    if (options.stockId) {
      query = query.extend(Q.where("stock_id", options.stockId));
    }

    // Filter by recipe
    if (options.recipeId) {
      query = query.extend(Q.where("recipe_id", options.recipeId));
    }

    // Filter by date range
    if (options.startDate || options.endDate) {
      if (options.startDate && options.endDate) {
        query = query.extend(
          Q.where("consumed_date", Q.between(options.startDate, options.endDate))
        );
      } else if (options.startDate) {
        query = query.extend(Q.where("consumed_date", Q.gte(options.startDate)));
      } else if (options.endDate) {
        query = query.extend(Q.where("consumed_date", Q.lte(options.endDate)));
      }
    }

    // Apply sorting (most recent first by default)
    query = this.applySorting(
      query,
      options.sortBy || "consumed_date",
      options.sortOrder || "desc"
    );

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    return await query.fetch();
  }

  // Get count of ingredients used before their expiry date
  async getIngredientsUsedBeforeExpiryCount(): Promise<number> {
    return await this.collection.query(Q.where("is_before_expiry", true)).fetchCount();
  }
}
