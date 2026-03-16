// @ts-nocheck
/**
 * Achievement Service
 *
 * Checks and unlocks achievements based on user activity.
 * Evaluates achievement criteria and manages user progress toward achievements.
 */

import { AchievementRepository } from "../db/repositories/AchievementRepository";
import { UserAchievementRepository } from "../db/repositories/UserAchievementRepository";
import { CookingHistoryRepository } from "../db/repositories/CookingHistoryRepository";
import { RecipeRepository } from "../db/repositories/RecipeRepository";
import { StreakService } from "./StreakService";
import type { AchievementRequirement, AchievementProgress } from "~/types/achievements";
import { log } from "~/utils/logger";
import { scheduleAchievementUnlock } from "~/lib/notifications/achievement-notifications";

export interface AchievementCheckResult {
  newlyUnlocked: Array<{
    achievementId: string;
    title: string;
    description: string;
    icon: string;
    xp: number;
  }>;
  progressUpdated: Array<{
    achievementId: string;
    title: string;
    progress: number;
    target: number;
  }>;
}

export class AchievementService {
  private achievementRepo: AchievementRepository;
  private userAchievementRepo: UserAchievementRepository;
  private cookingHistoryRepo: CookingHistoryRepository;
  private streakService: StreakService;
  private recipeRepo: RecipeRepository;

  constructor() {
    this.achievementRepo = new AchievementRepository();
    this.userAchievementRepo = new UserAchievementRepository();
    this.cookingHistoryRepo = new CookingHistoryRepository();
    this.streakService = new StreakService();
    this.recipeRepo = new RecipeRepository();
  }

  /**
   * Check all achievements and unlock any that meet criteria
   * This is the main entry point for achievement checking
   */
  async checkAchievements(): Promise<AchievementCheckResult> {
    try {
      const result: AchievementCheckResult = {
        newlyUnlocked: [],
        progressUpdated: [],
      };

      // Get all visible achievements
      const achievements = await this.achievementRepo.getVisibleAchievements();

      // Check each achievement
      for (const achievement of achievements) {
        const checkResult = await this.checkAndUnlockAchievement(achievement.id);

        if (checkResult.newlyUnlocked) {
          result.newlyUnlocked.push({
            achievementId: achievement.id,
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            xp: achievement.xpValue,
          });
        }

        if (checkResult.progressUpdated) {
          result.progressUpdated.push({
            achievementId: achievement.id,
            title: achievement.title,
            progress: checkResult.currentProgress,
            target: checkResult.target,
          });
        }
      }

      return result;
    } catch (error) {
      log.error("Error checking achievements:", error);
      return { newlyUnlocked: [], progressUpdated: [] };
    }
  }

  /**
   * Check a specific achievement and unlock if criteria is met
   */
  async checkAndUnlockAchievement(achievementId: string): Promise<{
    newlyUnlocked: boolean;
    progressUpdated: boolean;
    currentProgress: number;
    target: number;
  }> {
    try {
      const achievements = await this.achievementRepo.getAchievements();
      const achievement = achievements.find((a) => a.id === achievementId);

      if (!achievement) {
        log.warn(`Achievement not found: ${achievementId}`);
        return { newlyUnlocked: false, progressUpdated: false, currentProgress: 0, target: 0 };
      }

      // Get the user achievement record
      const userAchievement = await this.userAchievementRepo.getByAchievementId(achievementId);

      // If already unlocked, skip
      if (userAchievement && userAchievement.status === "unlocked") {
        return {
          newlyUnlocked: false,
          progressUpdated: false,
          currentProgress: userAchievement.progress,
          target: this.getTargetFromRequirement(
            achievement.parsedRequirement as AchievementRequirement
          ),
        };
      }

      // Parse requirement and get current progress
      const requirement = achievement.parsedRequirement as AchievementRequirement;
      const currentProgress = await this.getCurrentProgress(requirement);
      const target = requirement.target;

      // Update progress
      await this.userAchievementRepo.updateProgress(achievementId, currentProgress);

      // Check if achievement should be unlocked
      if (currentProgress >= target) {
        await this.unlockAchievement(achievementId);
        return { newlyUnlocked: true, progressUpdated: true, currentProgress, target };
      }

      // Update status to in_progress if progress > 0
      if (currentProgress > 0 && userAchievement?.status === "locked") {
        await this.userAchievementRepo.updateProgress(
          achievementId,
          currentProgress,
          "in_progress"
        );
      }

      return { newlyUnlocked: false, progressUpdated: true, currentProgress, target };
    } catch (error) {
      log.error(`Error checking achievement ${achievementId}:`, error);
      return { newlyUnlocked: false, progressUpdated: false, currentProgress: 0, target: 0 };
    }
  }

  /**
   * Unlock a specific achievement
   */
  async unlockAchievement(achievementId: string): Promise<boolean> {
    try {
      const achievements = await this.achievementRepo.getAchievements();
      const achievement = achievements.find((a) => a.id === achievementId);

      if (!achievement) {
        log.warn(`Achievement not found: ${achievementId}`);
        return false;
      }

      // Unlock the achievement
      await this.userAchievementRepo.unlockAchievement(achievementId);

      log.info(`🏆 Achievement unlocked: ${achievement.title}`);

      // Schedule notification for the unlocked achievement
      try {
        await scheduleAchievementUnlock({
          achievementId: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          xp: achievement.xpValue,
          reward: achievement.parsedReward,
        });
      } catch (notifError) {
        // Non-critical error - don't fail the unlock if notification fails
        log.warn(`Failed to schedule achievement notification: ${notifError}`);
      }

      return true;
    } catch (error) {
      log.error(`Error unlocking achievement ${achievementId}:`, error);
      return false;
    }
  }

  /**
   * Get progress for a specific achievement
   */
  async getProgress(achievementId: string): Promise<AchievementProgress | null> {
    try {
      const achievements = await this.achievementRepo.getAchievements();
      const achievement = achievements.find((a) => a.id === achievementId);

      if (!achievement) {
        return null;
      }

      const userAchievement = await this.userAchievementRepo.getByAchievementId(achievementId);
      const requirement = achievement.parsedRequirement as AchievementRequirement;
      const target = requirement.target;

      // Get current progress
      const currentProgress = await this.getCurrentProgress(requirement);

      // Use user achievement progress if available
      const progress = userAchievement?.progress ?? currentProgress;
      const isUnlocked = userAchievement?.status === "unlocked";

      const progressPercentage = Math.min(100, (progress / target) * 100);

      // Calculate next milestone
      let nextMilestone;
      if (!isUnlocked && progress < target) {
        nextMilestone = {
          target,
          current: progress,
          remaining: target - progress,
        };
      }

      return {
        achievement: {
          id: achievement.id,
          // @ts-expect-error
          type: achievement.type,
          // @ts-expect-error
          category: achievement.category,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          requirement,
          reward: achievement.parsedReward,
          xp: achievement.xpValue,
          sortOrder: achievement.sortOrder,
          hidden: achievement.isHidden,
        },
        // @ts-expect-error
        userAchievement: userAchievement
          ? {
              id: userAchievement.id,
              achievementId: userAchievement.achievementId,
              status: userAchievement.status,
              progress: userAchievement.progress,
              unlockedAt: userAchievement.unlockedAtDate,
              lastCheckedAt: userAchievement.lastCheckedAtDate,
            }
          : undefined,
        progress,
        progressPercentage,
        isUnlocked,
        isLocked: !isUnlocked && progress === 0,
        isInProgress: !isUnlocked && progress > 0,
        nextMilestone,
      };
    } catch (error) {
      log.error(`Error getting progress for achievement ${achievementId}:`, error);
      return null;
    }
  }

  /**
   * Get progress for all achievements in a category
   */
  async getProgressByCategory(category: string): Promise<AchievementProgress[]> {
    try {
      const achievements = await this.achievementRepo.getAchievementsByCategory(category);
      const progressPromises = achievements.map((a) => this.getProgress(a.id));
      const results = await Promise.all(progressPromises);
      return results.filter((p): p is AchievementProgress => p !== null);
    } catch (error) {
      log.error(`Error getting progress for category ${category}:`, error);
      return [];
    }
  }

  /**
   * Get progress for all achievements
   */
  async getAllProgress(): Promise<AchievementProgress[]> {
    try {
      const achievements = await this.achievementRepo.getVisibleAchievements();
      const progressPromises = achievements.map((a) => this.getProgress(a.id));
      const results = await Promise.all(progressPromises);
      return results.filter((p): p is AchievementProgress => p !== null);
    } catch (error) {
      log.error("Error getting all achievement progress:", error);
      return [];
    }
  }

  /**
   * Update achievement progress manually (for special cases)
   */
  async updateProgress(achievementId: string, progress: number): Promise<boolean> {
    try {
      await this.userAchievementRepo.updateProgress(achievementId, progress);

      // Check if achievement should be unlocked
      const achievements = await this.achievementRepo.getAchievements();
      const achievement = achievements.find((a) => a.id === achievementId);

      if (achievement) {
        const requirement = achievement.parsedRequirement as AchievementRequirement;
        if (progress >= requirement.target) {
          await this.unlockAchievement(achievementId);
        }
      }

      return true;
    } catch (error) {
      log.error(`Error updating progress for achievement ${achievementId}:`, error);
      return false;
    }
  }

  /**
   * Increment achievement progress by a specific amount
   */
  async incrementProgress(achievementId: string, amount: number = 1): Promise<boolean> {
    try {
      await this.userAchievementRepo.incrementProgress(achievementId, amount);

      // Check if achievement should be unlocked
      const userAchievement = await this.userAchievementRepo.getByAchievementId(achievementId);
      if (userAchievement) {
        const achievements = await this.achievementRepo.getAchievements();
        const achievement = achievements.find((a) => a.id === achievementId);

        if (achievement) {
          const requirement = achievement.parsedRequirement as AchievementRequirement;
          if (userAchievement.progress >= requirement.target) {
            await this.unlockAchievement(achievementId);
          }
        }
      }

      return true;
    } catch (error) {
      log.error(`Error incrementing progress for achievement ${achievementId}:`, error);
      return false;
    }
  }

  /**
   * Get current progress for a specific requirement
   * This is where we calculate progress based on the requirement type
   */
  private async getCurrentProgress(requirement: AchievementRequirement): Promise<number> {
    try {
      switch (requirement.metric) {
        case "consecutive_days":
          // Current streak
          return await this.streakService.calculateCurrentStreak();

        case "longest_streak":
          // Longest streak
          return await this.streakService.calculateLongestStreak();

        case "recipes_cooked":
          // Total unique recipes cooked
          const stats = await this.cookingHistoryRepo.getCookingStats();
          return stats.uniqueRecipes;

        case "total_cooks":
          // Total cooking sessions
          const allCooks = await this.cookingHistoryRepo.getCookingHistory();
          return allCooks.length;

        case "ingredients_tracked":
          // This would need to query the stock table - placeholder for now
          // TODO: Implement when stock repository is available
          return 0;

        case "spices_tracked":
          // This would need to query the stock table filtered by spice type - placeholder
          // TODO: Implement when stock repository is available
          return 0;

        case "ingredients_used_before_expiry":
          // This would need to track ingredient usage before expiry - placeholder
          // TODO: Implement when expiry tracking is available
          return 0;

        case "achievements_shared":
          // This would need to track shares - placeholder
          // TODO: Implement when sharing is available
          return 0;

        case "breakfast_recipes_cooked": {
          const breakfastRecipes = await this.recipeRepo.getRecipesByTag("breakfast");
          const breakfastRecipeIds = new Set(breakfastRecipes.map((r) => r.id));
          const allCooks = await this.cookingHistoryRepo.getCookingHistory();
          return allCooks.filter((c) => breakfastRecipeIds.has(c.recipeId)).length;
        }

        case "dinner_recipes_cooked": {
          const dinnerRecipes = await this.recipeRepo.getRecipesByTag("dinner");
          const dinnerRecipeIds = new Set(dinnerRecipes.map((r) => r.id));
          const allCooks = await this.cookingHistoryRepo.getCookingHistory();
          return allCooks.filter((c) => dinnerRecipeIds.has(c.recipeId)).length;
        }

        default:
          log.warn(`Unknown achievement metric: ${requirement.metric}`);
          return 0;
      }
    } catch (error) {
      log.error("Error getting current progress:", error);
      return 0;
    }
  }

  /**
   * Extract target value from requirement
   */
  private getTargetFromRequirement(requirement: AchievementRequirement): number {
    return requirement.target;
  }
}

// Singleton instance
export const achievementService = new AchievementService();
