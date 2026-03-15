// @ts-nocheck
/**
 * Streak Service
 *
 * Calculates cooking streaks based on user's cooking history.
 * A streak is defined as consecutive days with at least one cooking session.
 */

import { CookingHistoryRepository } from "../db/repositories/CookingHistoryRepository";
import type { StreakInfo, StreakEntry } from "~/types/achievements";
import { log } from "~/utils/logger";

export class StreakService {
  private cookingHistoryRepo: CookingHistoryRepository;

  constructor() {
    this.cookingHistoryRepo = new CookingHistoryRepository();
  }

  /**
   * Calculate current cooking streak
   * Returns the number of consecutive days with cooking activity ending today or most recent cooking day
   */
  async calculateCurrentStreak(): Promise<number> {
    try {
      const allHistory = await this.cookingHistoryRepo.getCookingHistory({
        sortBy: "cooked_at",
        sortOrder: "desc",
      });

      if (allHistory.length === 0) {
        return 0;
      }

      // Group cooking sessions by date (YYYY-MM-DD format)
      const cookingDays = this.groupCookingDaysByDate(allHistory);

      // Sort dates in descending order (most recent first)
      const sortedDates = Array.from(cookingDays.keys()).sort((a, b) => b.getTime() - a.getTime());

      if (sortedDates.length === 0) {
        return 0;
      }

      const today = this.normalizeToDate(new Date());
      const mostRecentCookingDate = sortedDates[0]!;

      // Calculate days since last cooking
      const daysSinceLastCooking = Math.floor(
        (today.getTime() - mostRecentCookingDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If the last cooking was more than 1 day ago, streak is broken
      if (daysSinceLastCooking > 1) {
        return 0;
      }

      // Count consecutive days from most recent cooking date backwards
      let currentStreak = 1;
      let currentDate = mostRecentCookingDate;

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = sortedDates[i];
        const daysDiff = Math.floor(
          // @ts-expect-error
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If exactly 1 day difference, continue streak
        if (daysDiff === 1) {
          currentStreak++;
          // @ts-expect-error
          currentDate = prevDate;
        } else {
          // Streak broken
          break;
        }
      }

      return currentStreak;
    } catch (error) {
      log.error("Error calculating current streak:", error);
      return 0;
    }
  }

  /**
   * Calculate longest cooking streak in user's history
   */
  async calculateLongestStreak(): Promise<number> {
    try {
      const allHistory = await this.cookingHistoryRepo.getCookingHistory({
        sortBy: "cooked_at",
        sortOrder: "asc",
      });

      if (allHistory.length === 0) {
        return 0;
      }

      // Group cooking sessions by date
      const cookingDays = this.groupCookingDaysByDate(allHistory);

      // Sort dates in ascending order (oldest first)
      const sortedDates = Array.from(cookingDays.keys()).sort((a, b) => a.getTime() - b.getTime());

      if (sortedDates.length === 0) {
        return 0;
      }

      let longestStreak = 1;
      let currentStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = sortedDates[i - 1]!;
        const currDate = sortedDates[i]!;

        const daysDiff = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If exactly 1 day difference, continue streak
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          // Streak broken, reset
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }

      // Final comparison in case the longest streak is at the end
      longestStreak = Math.max(longestStreak, currentStreak);

      return longestStreak;
    } catch (error) {
      log.error("Error calculating longest streak:", error);
      return 0;
    }
  }

  /**
   * Get comprehensive streak information including history
   */
  async getStreakInfo(): Promise<StreakInfo> {
    try {
      const allHistory = await this.cookingHistoryRepo.getCookingHistory({
        sortBy: "cooked_at",
        sortOrder: "desc",
      });

      const currentStreak = await this.calculateCurrentStreak();
      const longestStreak = await this.calculateLongestStreak();

      let lastCookingDate: Date | undefined;
      if (allHistory.length > 0) {
        // @ts-expect-error
        lastCookingDate = allHistory[0].cookedAtDate;
      }

      // Build streak history (all streaks with their dates)
      const streakHistory = this.buildStreakHistory(allHistory);

      return {
        currentStreak,
        longestStreak,
        lastCookingDate,
        streakHistory,
      };
    } catch (error) {
      log.error("Error getting streak info:", error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakHistory: [],
      };
    }
  }

  /**
   * Check if streak is still active (cooked within last 24 hours)
   */
  async isStreakActive(): Promise<boolean> {
    try {
      const currentStreak = await this.calculateCurrentStreak();
      return currentStreak > 0;
    } catch (error) {
      log.error("Error checking if streak is active:", error);
      return false;
    }
  }

  /**
   * Get days until streak breaks (if no cooking today)
   */
  async getDaysUntilStreakBreaks(): Promise<number | null> {
    try {
      const allHistory = await this.cookingHistoryRepo.getCookingHistory({
        sortBy: "cooked_at",
        sortOrder: "desc",
        limit: 1,
      });

      if (allHistory.length === 0) {
        return null;
      }

      // @ts-expect-error
      const lastCookingDate = this.normalizeToDate(allHistory[0].cookedAtDate);
      const today = this.normalizeToDate(new Date());

      const daysSinceLastCooking = Math.floor(
        (today.getTime() - lastCookingDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If already more than 1 day, streak is broken
      if (daysSinceLastCooking > 1) {
        return null;
      }

      // Return days until break (1 if cooked today, 0 if cooked yesterday)
      return daysSinceLastCooking === 0 ? 1 : 0;
    } catch (error) {
      log.error("Error calculating days until streak breaks:", error);
      return null;
    }
  }

  /**
   * Group cooking sessions by date (ignoring time)
   */
  private groupCookingDaysByDate(
    history: Awaited<ReturnType<typeof this.cookingHistoryRepo.getCookingHistory>>
  ): Map<Date, Set<string>> {
    const cookingDays = new Map<Date, Set<string>>();

    for (const record of history) {
      const dateKey = this.normalizeToDate(record.cookedAtDate);

      if (!cookingDays.has(dateKey)) {
        cookingDays.set(dateKey, new Set());
      }

      // Track unique recipe IDs for this date
      cookingDays.get(dateKey)!.add(record.recipeId);
    }

    return cookingDays;
  }

  /**
   * Normalize a date to midnight (remove time component)
   */
  private normalizeToDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Build streak history from cooking records
   * Returns array of streak entries with dates and counts
   */
  private buildStreakHistory(
    history: Awaited<ReturnType<typeof this.cookingHistoryRepo.getCookingHistory>>
  ): StreakEntry[] {
    if (history.length === 0) {
      return [];
    }

    const cookingDays = this.groupCookingDaysByDate(history);
    const sortedDates = Array.from(cookingDays.keys()).sort((a, b) => a.getTime() - b.getTime());

    const streakHistory: StreakEntry[] = [];
    let currentStreak = 1;
    let streakStartDate = sortedDates[0];

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];

      const daysDiff = Math.floor(
        // @ts-expect-error
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // Continue current streak
        currentStreak++;
      } else {
        // Streak ended, record it
        streakHistory.push({
          // @ts-expect-error
          date: streakStartDate,
          streakCount: currentStreak,
        });

        // Start new streak
        currentStreak = 1;
        streakStartDate = currDate;
      }
    }

    // Don't forget the last streak
    streakHistory.push({
      // @ts-expect-error
      date: streakStartDate,
      streakCount: currentStreak,
    });

    // Sort by date descending (most recent first)
    return streakHistory.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}

// Singleton instance
export const streakService = new StreakService();
