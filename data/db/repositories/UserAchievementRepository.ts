import { Q } from "@nozbe/watermelondb";
import UserAchievement, { type UserAchievementData } from "../models/UserAchievement";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface UserAchievementSearchOptions extends SearchOptions {
  status?: string; // locked | unlocked | in_progress
  achievementId?: string;
  minProgress?: number;
}

export class UserAchievementRepository extends BaseRepository<UserAchievement> {
  constructor() {
    super("user_achievement");
  }

  // Create or get user achievement for a specific achievement
  async getOrCreateForAchievement(achievementId: string): Promise<UserAchievement> {
    // First try to find existing
    const existing = await this.collection.query(Q.where("achievement_id", achievementId)).fetch();

    if (existing.length > 0) {
      const first = existing[0];
      if (first) return first;
    }

    // Create new one
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.achievementId = achievementId;
        record.status = "locked";
        record.progress = 0;
        record.lastCheckedAt = Date.now();
      });
    });
  }

  // Update progress for a user achievement
  async updateProgress(
    achievementId: string,
    progress: number,
    status?: string
  ): Promise<UserAchievement> {
    const userAchievement = await this.getOrCreateForAchievement(achievementId);

    return await database.write(async () => {
      return await userAchievement.update((record) => {
        record.progress = progress;
        record.lastCheckedAt = Date.now();
        if (status) {
          record.status = status;
        }
      });
    });
  }

  // Increment progress for a user achievement
  async incrementProgress(achievementId: string, amount: number = 1): Promise<UserAchievement> {
    const userAchievement = await this.getOrCreateForAchievement(achievementId);

    return await database.write(async () => {
      return await userAchievement.update((record) => {
        record.progress = (record.progress || 0) + amount;
        record.lastCheckedAt = Date.now();
      });
    });
  }

  // Unlock an achievement
  async unlockAchievement(achievementId: string): Promise<UserAchievement> {
    const userAchievement = await this.getOrCreateForAchievement(achievementId);

    return await database.write(async () => {
      return await userAchievement.update((record) => {
        record.status = "unlocked";
        record.unlockedAt = Date.now();
        record.lastCheckedAt = Date.now();
      });
    });
  }

  // Get user achievements with optional filters
  async getUserAchievements(
    options: UserAchievementSearchOptions = {}
  ): Promise<UserAchievement[]> {
    let query = this.collection.query();

    // Filter by status
    if (options.status) {
      query = query.extend(Q.where("status", options.status));
    }

    // Filter by achievement
    if (options.achievementId) {
      query = query.extend(Q.where("achievement_id", options.achievementId));
    }

    // Filter by minimum progress
    if (options.minProgress !== undefined) {
      query = query.extend(Q.where("progress", Q.gte(options.minProgress)));
    }

    // Apply sorting (most recently checked first by default)
    query = this.applySorting(
      query,
      options.sortBy || "last_checked_at",
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

  // Get unlocked achievements
  async getUnlockedAchievements(): Promise<UserAchievement[]> {
    return await this.collection
      .query(Q.where("status", "unlocked"), Q.sortBy("unlocked_at", Q.desc))
      .fetch();
  }

  // Get in-progress achievements
  async getInProgressAchievements(): Promise<UserAchievement[]> {
    return await this.collection
      .query(Q.where("status", "in_progress"), Q.sortBy("last_checked_at", Q.desc))
      .fetch();
  }

  // Get locked achievements
  async getLockedAchievements(): Promise<UserAchievement[]> {
    return await this.collection
      .query(Q.where("status", "locked"), Q.sortBy("last_checked_at", Q.desc))
      .fetch();
  }

  // Get user achievement for a specific achievement
  async getByAchievementId(achievementId: string): Promise<UserAchievement | null> {
    const results = await this.collection.query(Q.where("achievement_id", achievementId)).fetch();

    // @ts-expect-error
    return results.length > 0 ? results[0] : null;
  }

  async getByAchievementIds(achievementIds: string[]): Promise<UserAchievement[]> {
    if (achievementIds.length === 0) {
      return [];
    }

    return await this.collection.query(Q.where("achievement_id", Q.oneOf(achievementIds))).fetch();
  }

  // Get recently unlocked achievements
  async getRecentlyUnlocked(limit: number = 10): Promise<UserAchievement[]> {
    return await this.collection
      .query(Q.where("status", "unlocked"), Q.sortBy("unlocked_at", Q.desc), Q.take(limit))
      .fetch();
  }

  // Count achievements by status
  async countByStatus(status: string): Promise<number> {
    return await this.collection.query(Q.where("status", status)).fetchCount();
  }

  // Get total XP earned from unlocked achievements
  // Note: This requires joining with achievement table to get XP values
  async getTotalXPEarned(): Promise<number> {
    const unlockedAchievements = await this.getUnlockedAchievements();
    if (unlockedAchievements.length === 0) return 0;

    let totalXP = 0;

    // Extract all achievement IDs
    const achievementIds = unlockedAchievements.map((ua) => ua.achievementId);

    // Batch fetch all related achievements in one query to prevent N+1 queries
    const achievements = await database.collections
      .get("achievement")
      .query(Q.where("id", Q.oneOf(achievementIds)))
      .fetch();

    for (const achievement of achievements) {
      totalXP += (achievement as any).xpValue ?? 0;
    }

    return totalXP;
  }

  // Update user achievement
  async updateUserAchievement(
    id: string,
    data: Partial<UserAchievementData>
  ): Promise<UserAchievement> {
    return await this.update(id, data);
  }

  // Check and update achievement status based on progress
  // This would typically be called with the achievement's requirement target
  async checkAndUpdateStatus(
    achievementId: string,
    currentProgress: number,
    targetProgress: number
  ): Promise<UserAchievement> {
    const userAchievement = await this.getOrCreateForAchievement(achievementId);

    let newStatus = userAchievement.status;
    if (currentProgress >= targetProgress && userAchievement.status !== "unlocked") {
      newStatus = "unlocked";
    } else if (currentProgress > 0 && userAchievement.status === "locked") {
      newStatus = "in_progress";
    }

    return await database.write(async () => {
      return await userAchievement.update((record) => {
        record.progress = currentProgress;
        record.status = newStatus;
        record.lastCheckedAt = Date.now();
        if (newStatus === "unlocked" && !record.unlockedAt) {
          record.unlockedAt = Date.now();
        }
      });
    });
  }
}
