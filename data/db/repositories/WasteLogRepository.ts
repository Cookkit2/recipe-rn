// @ts-nocheck
import { Q } from "@nozbe/watermelondb";
import WasteLog, { type WasteLogData } from "../models/WasteLog";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface WasteLogSearchOptions extends SearchOptions {
  stockId?: string;
  reason?: string;
  hasCost?: boolean;
  hasReason?: boolean;
  startDate?: number;
  endDate?: number;
  minCost?: number;
  maxCost?: number;
}

export interface WasteStats {
  totalWasteEntries: number;
  totalQuantityWasted: number;
  totalEstimatedCost: number;
  averageWastePerEntry: number;
  wasteByReason: Record<string, { count: number; quantity: number; cost: number }>;
  mostWastedItems: Array<{
    stockId: string;
    wasteCount: number;
    totalQuantity: number;
    totalCost: number;
  }>;
  currentStreak: number;
  longestStreak: number;
  periodStart?: number;
  periodEnd?: number;
}

export interface WasteOverTimeData {
  date: number;
  quantity: number;
  cost: number;
  count: number;
}

export class WasteLogRepository extends BaseRepository<WasteLog> {
  constructor() {
    super("waste_log");
  }

  // Record a new waste log entry
  async recordWaste(
    stockId: string,
    quantityWasted: number,
    data?: Partial<Omit<WasteLogData, "stockId" | "quantityWasted">>
  ): Promise<WasteLog> {
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.stockId = stockId;
        record.quantityWasted = quantityWasted;
        record.wasteDate = data?.wasteDate ?? Date.now();
        if (data?.reason) record.reason = data.reason;
        if (data?.estimatedCost !== undefined) record.estimatedCost = data.estimatedCost;
      });
    });
  }

  // Get waste logs with optional filters
  async getWasteLogs(options: WasteLogSearchOptions = {}): Promise<WasteLog[]> {
    let query = this.collection.query();

    // Filter by stock item
    if (options.stockId) {
      query = query.extend(Q.where("stock_id", options.stockId));
    }

    // Filter by reason
    if (options.reason) {
      query = query.extend(Q.where("reason", options.reason));
    }

    // Filter by date range
    if (options.startDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.gte(options.startDate)));
    }
    if (options.endDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.lte(options.endDate)));
    }

    // Filter by estimated cost
    if (options.minCost !== undefined) {
      query = query.extend(Q.where("estimated_cost", Q.gte(options.minCost)));
    }
    if (options.maxCost !== undefined) {
      query = query.extend(Q.where("estimated_cost", Q.lte(options.maxCost)));
    }

    // Apply sorting (most recent first by default)
    query = this.applySorting(query, options.sortBy || "waste_date", options.sortOrder || "desc");

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    let records = await query.fetch();

    // Post-process filters that can't be done in SQL
    if (options.hasCost === true) {
      records = records.filter((r) => r.hasEstimatedCost);
    } else if (options.hasCost === false) {
      records = records.filter((r) => !r.hasEstimatedCost);
    }

    if (options.hasReason === true) {
      records = records.filter((r) => r.hasReason);
    } else if (options.hasReason === false) {
      records = records.filter((r) => !r.hasReason);
    }

    return records;
  }

  // Get waste statistics for a specific time period
  async getWasteStats(startDate?: number, endDate?: number): Promise<WasteStats> {
    let query = this.collection.query();

    if (startDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.gte(startDate)));
    }
    if (endDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.lte(endDate)));
    }

    const records = await query.fetch();

    const totalWasteEntries = records.length;
    const totalQuantityWasted = records.reduce((sum, r) => sum + r.quantityWasted, 0);
    const totalEstimatedCost = records.reduce((sum, r) => {
      return sum + (r.estimatedCost ?? 0);
    }, 0);
    const averageWastePerEntry =
      totalWasteEntries > 0 ? totalQuantityWasted / totalWasteEntries : 0;

    // Group by reason
    const wasteByReason: Record<string, { count: number; quantity: number; cost: number }> = {};
    for (const record of records) {
      const reason = record.reason || "unknown";
      if (!wasteByReason[reason]) {
        wasteByReason[reason] = { count: 0, quantity: 0, cost: 0 };
      }
      wasteByReason[reason].count++;
      wasteByReason[reason].quantity += record.quantityWasted;
      wasteByReason[reason].cost += record.estimatedCost ?? 0;
    }

    // Find most wasted items
    const itemMap = new Map<
      string,
      { wasteCount: number; totalQuantity: number; totalCost: number }
    >();
    for (const record of records) {
      const existing = itemMap.get(record.stockId);
      if (existing) {
        existing.wasteCount++;
        existing.totalQuantity += record.quantityWasted;
        existing.totalCost += record.estimatedCost ?? 0;
      } else {
        itemMap.set(record.stockId, {
          wasteCount: 1,
          totalQuantity: record.quantityWasted,
          totalCost: record.estimatedCost ?? 0,
        });
      }
    }

    const mostWastedItems = Array.from(itemMap.entries())
      .map(([stockId, data]) => ({
        stockId,
        ...data,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(records);

    return {
      totalWasteEntries,
      totalQuantityWasted,
      totalEstimatedCost,
      averageWastePerEntry,
      wasteByReason,
      mostWastedItems,
      currentStreak,
      longestStreak,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  // Calculate streaks (consecutive days without waste)
  private calculateStreaks(records: WasteLog[]): { currentStreak: number; longestStreak: number } {
    if (records.length === 0) {
      // No waste entries means infinite streak, but we cap at a reasonable number for display
      const daysSinceEpoch = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      return { currentStreak: daysSinceEpoch, longestStreak: daysSinceEpoch };
    }

    // Group waste events by date (day granularity)
    const wasteDates = new Set<number>();
    for (const record of records) {
      const date = new Date(record.wasteDate);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      wasteDates.add(dayStart);
    }

    const sortedWasteDates = Array.from(wasteDates).sort((a, b) => a - b);

    // Calculate current streak (days without waste, counting backward from today)
    let currentStreak = 0;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    // Check each day going backward from today
    for (let i = 0; i < 36500; i++) {
      // Check up to 100 years back
      const checkDate = todayStart - i * oneDay;
      if (wasteDates.has(checkDate)) {
        break; // Found a waste day, streak ends
      }
      currentStreak++;
    }

    // Calculate longest streak (max consecutive days without waste)
    let longestStreak = currentStreak; // Start with current streak
    let tempStreak = 0;

    // Iterate through all dates, counting gaps between waste events
    for (let i = 1; i < sortedWasteDates.length; i++) {
      // Days between consecutive waste events
      // @ts-expect-error
      const daysBetween = Math.round((sortedWasteDates[i] - sortedWasteDates[i - 1]) / oneDay) - 1;
      tempStreak = daysBetween;

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    // Also check after the last waste event to today
    // @ts-expect-error
    const daysSinceLastWaste = Math.max(
      0,
      Math.round((todayStart - sortedWasteDates[sortedWasteDates.length - 1]) / oneDay) - 1
    );
    if (daysSinceLastWaste > longestStreak) {
      longestStreak = daysSinceLastWaste;
    }

    return { currentStreak, longestStreak };
  }

  // Get waste data over time (grouped by day)
  async getWasteOverTime(
    startDate?: number,
    endDate?: number,
    groupBy: "day" | "week" | "month" = "day"
  ): Promise<WasteOverTimeData[]> {
    let query = this.collection.query();

    if (startDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.gte(startDate)));
    }
    if (endDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.lte(endDate)));
    }

    query = query.extend(Q.sortBy("waste_date", Q.asc));

    const records = await query.fetch();

    // Group by time period
    const timeMap = new Map<number, { count: number; quantity: number; cost: number }>();

    for (const record of records) {
      const date = new Date(record.wasteDate);
      let key: number;

      if (groupBy === "day") {
        // Group by day (start of day)
        key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      } else if (groupBy === "week") {
        // Group by week (start of week - Sunday)
        const dayOfWeek = date.getDay();
        key = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek).getTime();
      } else {
        // Group by month (start of month)
        key = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      }

      const existing = timeMap.get(key);
      if (existing) {
        existing.count++;
        existing.quantity += record.quantityWasted;
        existing.cost += record.estimatedCost ?? 0;
      } else {
        timeMap.set(key, {
          count: 1,
          quantity: record.quantityWasted,
          cost: record.estimatedCost ?? 0,
        });
      }
    }

    // Convert to array and sort by date
    return Array.from(timeMap.entries())
      .map(([date, data]) => ({
        date,
        quantity: data.quantity,
        cost: data.cost,
        count: data.count,
      }))
      .sort((a, b) => a.date - b.date);
  }

  // Get waste by specific reason
  async getWasteByReason(reason: string): Promise<WasteLog[]> {
    return await this.collection
      .query(Q.where("reason", reason), Q.sortBy("waste_date", Q.desc))
      .fetch();
  }

  // Get total waste cost for a period
  async getTotalWasteCost(startDate?: number, endDate?: number): Promise<number> {
    let query = this.collection.query();

    if (startDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.gte(startDate)));
    }
    if (endDate !== undefined) {
      query = query.extend(Q.where("waste_date", Q.lte(endDate)));
    }

    const records = await query.fetch();

    return records.reduce((sum, r) => sum + (r.estimatedCost ?? 0), 0);
  }

  // Get most wasted items
  async getMostWastedItems(
    limit: number = 10,
    startDate?: number,
    endDate?: number
  ): Promise<
    Array<{ stockId: string; wasteCount: number; totalQuantity: number; totalCost: number }>
  > {
    const stats = await this.getWasteStats(startDate, endDate);
    return stats.mostWastedItems.slice(0, limit);
  }

  // Get waste count for a specific stock item
  async getStockWasteCount(stockId: string): Promise<number> {
    const count = await this.collection.query(Q.where("stock_id", stockId)).fetchCount();
    return count;
  }

  // Get total quantity wasted for a specific stock item
  async getStockTotalWasteQuantity(stockId: string): Promise<number> {
    const records = await this.collection.query(Q.where("stock_id", stockId)).fetch();

    return records.reduce((sum, r) => sum + r.quantityWasted, 0);
  }

  // Delete waste logs for a specific stock item
  async deleteByStockId(stockId: string): Promise<void> {
    await database.write(async () => {
      const records = await this.collection.query(Q.where("stock_id", stockId)).fetch();

      await Promise.all(records.map((record) => record.destroyPermanently()));
    });
  }

  // Get waste logs for a date range
  async getWasteForDateRange(startDate: number, endDate: number): Promise<WasteLog[]> {
    return await this.collection
      .query(
        Q.where("waste_date", Q.gte(startDate)),
        Q.where("waste_date", Q.lte(endDate)),
        Q.sortBy("waste_date", Q.desc)
      )
      .fetch();
  }
}
