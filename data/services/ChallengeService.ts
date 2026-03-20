// @ts-nocheck
/**
 * Challenge Service
 *
 * Manages daily and weekly challenges for users.
 * Handles challenge lifecycle including starting, updating progress, completing, and claiming rewards.
 */

import { ChallengeRepository } from "../db/repositories/ChallengeRepository";
import { UserChallengeRepository } from "../db/repositories/UserChallengeRepository";
import type { ChallengeProgress, ChallengeRequirement } from "~/types/achievements";
import { log } from "~/utils/logger";
import { scheduleChallengeComplete } from "~/lib/notifications/achievement-notifications";

export interface ChallengeCheckResult {
  progressUpdated: Array<{
    challengeId: string;
    title: string;
    progress: number;
    target: number;
  }>;
  newlyCompleted: Array<{
    challengeId: string;
    title: string;
    description: string;
    xp: number;
  }>;
}

export class ChallengeService {
  private challengeRepo: ChallengeRepository;
  private userChallengeRepo: UserChallengeRepository;

  constructor() {
    this.challengeRepo = new ChallengeRepository();
    this.userChallengeRepo = new UserChallengeRepository();
  }

  /**
   * Get all currently active challenges
   * (available and within date range)
   */
  async getActiveChallenges(): Promise<ChallengeProgress[]> {
    try {
      const activeChallenges = await this.challengeRepo.getActiveChallenges();
      return await this.getProgressBatch(activeChallenges);
    } catch (error) {
      log.error("Error getting active challenges:", error);
      return [];
    }
  }

  /**
   * Get active daily challenges
   */
  async getActiveDailyChallenges(): Promise<ChallengeProgress[]> {
    try {
      const dailyChallenges = await this.challengeRepo.getActiveDailyChallenges();
      return await this.getProgressBatch(dailyChallenges);
    } catch (error) {
      log.error("Error getting active daily challenges:", error);
      return [];
    }
  }

  /**
   * Get active weekly challenges
   */
  async getActiveWeeklyChallenges(): Promise<ChallengeProgress[]> {
    try {
      const weeklyChallenges = await this.challengeRepo.getActiveWeeklyChallenges();
      return await this.getProgressBatch(weeklyChallenges);
    } catch (error) {
      log.error("Error getting active weekly challenges:", error);
      return [];
    }
  }

  /**
   * Get user's active (in progress) challenges
   */
  async getUserActiveChallenges(): Promise<ChallengeProgress[]> {
    try {
      const userChallenges = await this.userChallengeRepo.getActiveChallenges();
      if (userChallenges.length === 0) return [];
      const challengeIds = userChallenges.map((uc) => uc.challengeId);
      const challenges = await this.challengeRepo.getByIds(challengeIds);
      return await this.getProgressBatch(challenges);
    } catch (error) {
      log.error("Error getting user active challenges:", error);
      return [];
    }
  }

  /**
   * Get user's completed challenges
   */
  async getUserCompletedChallenges(): Promise<ChallengeProgress[]> {
    try {
      const userChallenges = await this.userChallengeRepo.getCompletedChallenges();
      if (userChallenges.length === 0) return [];
      const challengeIds = userChallenges.map((uc) => uc.challengeId);
      const challenges = await this.challengeRepo.getByIds(challengeIds);
      return await this.getProgressBatch(challenges);
    } catch (error) {
      log.error("Error getting user completed challenges:", error);
      return [];
    }
  }

  /**
   * Get unclaimed completed challenges (ready for reward claiming)
   */
  async getUnclaimedChallenges(): Promise<ChallengeProgress[]> {
    try {
      const userChallenges = await this.userChallengeRepo.getUnclaimedChallenges();
      if (userChallenges.length === 0) return [];
      const challengeIds = userChallenges.map((uc) => uc.challengeId);
      const challenges = await this.challengeRepo.getByIds(challengeIds);
      return await this.getProgressBatch(challenges);
    } catch (error) {
      log.error("Error getting unclaimed challenges:", error);
      return [];
    }
  }

  /**
   * Start a challenge
   */
  async startChallenge(challengeId: string): Promise<boolean> {
    try {
      // Verify challenge is active
      const challenge = await this.challengeRepo.getChallengeById(challengeId);

      if (!challenge) {
        log.warn(`Challenge not found: ${challengeId}`);
        return false;
      }

      if (!challenge.isActive) {
        log.warn(`Challenge is not active: ${challengeId}`);
        return false;
      }

      // Start the challenge
      await this.userChallengeRepo.startChallenge(challengeId);
      log.info(`🎯 Challenge started: ${challenge.title}`);
      return true;
    } catch (error) {
      log.error(`Error starting challenge ${challengeId}:`, error);
      return false;
    }
  }

  /**
   * Update challenge progress
   */
  async updateProgress(challengeId: string, progress: number): Promise<boolean> {
    try {
      const challenge = await this.challengeRepo.getChallengeById(challengeId);
      if (!challenge) {
        log.warn(`Challenge not found: ${challengeId}`);
        return false;
      }

      const target = challenge.parsedRequirement.target;

      // Get the previous status to check if it's newly completed
      const previousUserChallenge = await this.userChallengeRepo.getByChallengeId(challengeId);
      const previousStatus = previousUserChallenge?.status;

      // Update progress and check if completed
      const userChallenge = await this.userChallengeRepo.checkAndUpdateStatus(
        challengeId,
        progress,
        target
      );

      // If newly completed, log it and schedule notification
      if (userChallenge.status === "completed" && previousStatus !== "completed") {
        log.info(`✅ Challenge completed: ${challenge.title}`);

        // Schedule notification for the completed challenge
        try {
          await scheduleChallengeComplete({
            challengeId: challenge.id,
            title: challenge.title,
            description: challenge.description,
            xp: challenge.xpValue,
            reward: challenge.parsedReward?.bonus,
          });
        } catch (notifError) {
          // Non-critical error - don't fail the completion if notification fails
          log.warn(`Failed to schedule challenge notification: ${notifError}`);
        }
      }

      return true;
    } catch (error) {
      log.error(`Error updating progress for challenge ${challengeId}:`, error);
      return false;
    }
  }

  /**
   * Increment challenge progress by a specific amount
   */
  async incrementProgress(challengeId: string, amount: number = 1): Promise<boolean> {
    try {
      const userChallenge = await this.userChallengeRepo.getByChallengeId(challengeId);

      if (!userChallenge) {
        log.warn(`User challenge not found: ${challengeId}`);
        return false;
      }

      const newProgress = userChallenge.progress + amount;
      return await this.updateProgress(challengeId, newProgress);
    } catch (error) {
      log.error(`Error incrementing progress for challenge ${challengeId}:`, error);
      return false;
    }
  }

  /**
   * Complete a challenge
   */
  async completeChallenge(challengeId: string): Promise<boolean> {
    try {
      const challenge = await this.challengeRepo.getChallengeById(challengeId);

      if (!challenge) {
        log.warn(`Challenge not found: ${challengeId}`);
        return false;
      }

      // Get the previous status to check if it's newly completed
      const previousUserChallenge = await this.userChallengeRepo.getByChallengeId(challengeId);
      const previousStatus = previousUserChallenge?.status;

      await this.userChallengeRepo.completeChallenge(challengeId);
      log.info(`🏆 Challenge completed: ${challenge.title}`);

      // Only schedule notification if this is a new completion
      if (previousStatus !== "completed") {
        try {
          await scheduleChallengeComplete({
            challengeId: challenge.id,
            title: challenge.title,
            description: challenge.description,
            xp: challenge.xpValue,
            reward: challenge.parsedReward?.bonus,
          });
        } catch (notifError) {
          // Non-critical error - don't fail the completion if notification fails
          log.warn(`Failed to schedule challenge notification: ${notifError}`);
        }
      }

      return true;
    } catch (error) {
      log.error(`Error completing challenge ${challengeId}:`, error);
      return false;
    }
  }

  /**
   * Claim rewards for a completed challenge
   */
  async claimRewards(challengeId: string): Promise<{
    success: boolean;
    xp: number;
  }> {
    try {
      const challenge = await this.challengeRepo.getChallengeById(challengeId);

      if (!challenge) {
        log.warn(`Challenge not found: ${challengeId}`);
        return { success: false, xp: 0 };
      }

      await this.userChallengeRepo.claimRewards(challengeId);
      log.info(`💰 Rewards claimed for challenge: ${challenge.title} (+${challenge.xpValue} XP)`);

      return { success: true, xp: challenge.xpValue };
    } catch (error) {
      log.error(`Error claiming rewards for challenge ${challengeId}:`, error);
      return { success: false, xp: 0 };
    }
  }

  /**
   * Get progress for a specific challenge
   */
  async getProgress(challengeId: string): Promise<ChallengeProgress | null> {
    try {
      const challenge = await this.challengeRepo.getChallengeById(challengeId);

      if (!challenge) {
        return null;
      }

      const userChallenge = await this.userChallengeRepo.getByChallengeId(challengeId);
      const requirement = challenge.parsedRequirement;
      const target = requirement.target;

      // If no user challenge exists, progress is 0
      const progress = userChallenge?.progress ?? 0;
      const progressPercentage = Math.min(100, (progress / target) * 100);

      const isAvailable = !userChallenge || userChallenge.isAvailable;
      const isActive = userChallenge?.isActive ?? false;
      const isCompleted = userChallenge?.isCompleted ?? false;
      const isExpired = challenge.isExpired || userChallenge?.isExpired || false;

      let timeRemaining: number | undefined;
      if (!isExpired && !isCompleted) {
        timeRemaining = challenge.timeRemaining;
      }

      return {
        challenge: {
          id: challenge.id,
          type: challenge.type as any,
          title: challenge.title,
          description: challenge.description,
          requirement,
          reward: challenge.parsedReward,
          startDate: challenge.startDateDate,
          endDate: challenge.endDateDate,
          xp: challenge.xpValue,
        },
        userChallenge: userChallenge
          ? {
              id: userChallenge.id,
              challengeId: userChallenge.challengeId,
              status: userChallenge.status as any,
              progress: userChallenge.progress,
              startedAt: userChallenge.startedAtDate,
              completedAt: userChallenge.completedAtDate,
              claimedAt: userChallenge.claimedAtDate,
            }
          : undefined,
        progress,
        progressPercentage,
        isActive,
        isCompleted,
        isExpired,
        isAvailable,
        timeRemaining,
      };
    } catch (error) {
      log.error(`Error getting progress for challenge ${challengeId}:`, error);
      return null;
    }
  }

  /**
   * Get progress for multiple challenges in a batch to avoid N+1 queries
   */
  async getProgressBatch(challenges: any[]): Promise<ChallengeProgress[]> {
    if (challenges.length === 0) return [];

    try {
      const challengeIds = challenges.map((c) => c.id).filter(Boolean);
      const userChallenges = await this.userChallengeRepo.getByChallengeIds(challengeIds);

      const userChallengeMap = new Map();
      userChallenges.forEach((uc) => {
        userChallengeMap.set(uc.challengeId, uc);
      });

      return challenges.map((challenge) => {
        const userChallenge = userChallengeMap.get(challenge.id);
        const requirement = challenge.parsedRequirement;
        const target = requirement.target;

        const progress = userChallenge?.progress ?? 0;
        const progressPercentage = Math.min(100, (progress / target) * 100);

        const isAvailable = !userChallenge || userChallenge.isAvailable;
        const isActive = userChallenge?.isActive ?? false;
        const isCompleted = userChallenge?.isCompleted ?? false;
        const isExpired = challenge.isExpired || userChallenge?.isExpired || false;

        let timeRemaining: number | undefined;
        if (!isExpired && !isCompleted) {
          timeRemaining = challenge.timeRemaining;
        }

        return {
          challenge: {
            id: challenge.id,
            type: challenge.type as any,
            title: challenge.title,
            description: challenge.description,
            requirement,
            reward: challenge.parsedReward,
            startDate: challenge.startDateDate,
            endDate: challenge.endDateDate,
            xp: challenge.xpValue,
          },
          userChallenge: userChallenge
            ? {
                id: userChallenge.id,
                challengeId: userChallenge.challengeId,
                status: userChallenge.status as any,
                progress: userChallenge.progress,
                startedAt: userChallenge.startedAtDate,
                completedAt: userChallenge.completedAtDate,
                claimedAt: userChallenge.claimedAtDate,
              }
            : undefined,
          progress,
          progressPercentage,
          isActive,
          isCompleted,
          isExpired,
          isAvailable,
          timeRemaining,
        };
      });
    } catch (error) {
      log.error(`Error getting batch progress for challenges:`, error);
      return [];
    }
  }

  /**
   * Get progress for all active challenges
   */
  async getAllActiveProgress(): Promise<ChallengeProgress[]> {
    try {
      const activeChallenges = await this.challengeRepo.getActiveChallenges();
      return await this.getProgressBatch(activeChallenges);
    } catch (error) {
      log.error("Error getting all active challenge progress:", error);
      return [];
    }
  }

  /**
   * Check and update all active challenges based on user activity
   * This should be called when user completes relevant actions (cooking, etc.)
   */
  async checkChallenges(metric: string, amount: number = 1): Promise<ChallengeCheckResult> {
    try {
      const result: ChallengeCheckResult = {
        progressUpdated: [],
        newlyCompleted: [],
      };

      const activeChallenges = await this.challengeRepo.getActiveChallenges();

      for (const challenge of activeChallenges) {
        const requirement = challenge.parsedRequirement;

        // Check if this challenge is relevant to the metric
        if (!this.isChallengeRelevant(requirement, metric)) {
          continue;
        }

        const userChallenge = await this.userChallengeRepo.getByChallengeId(challenge.id);
        const currentProgress = userChallenge?.progress ?? 0;
        const newProgress = currentProgress + amount;

        // Update progress
        await this.updateProgress(challenge.id, newProgress);

        result.progressUpdated.push({
          challengeId: challenge.id,
          title: challenge.title,
          progress: newProgress,
          target: requirement.target,
        });

        // Check if newly completed
        if (newProgress >= requirement.target && !userChallenge?.isCompleted) {
          result.newlyCompleted.push({
            challengeId: challenge.id,
            title: challenge.title,
            description: challenge.description,
            xp: challenge.xpValue,
          });
        }
      }

      return result;
    } catch (error) {
      log.error("Error checking challenges:", error);
      return { progressUpdated: [], newlyCompleted: [] };
    }
  }

  /**
   * Check if a challenge is relevant to a specific metric
   */
  private isChallengeRelevant(requirement: ChallengeRequirement, metric: string): boolean {
    switch (requirement.type) {
      case "cook_recipes":
        return metric === "recipes_cooked";

      case "use_ingredients":
        return metric === "ingredients_used";

      case "try_new_recipe":
        return metric === "new_recipes";

      case "cook_category":
        return (
          metric === "recipes_cooked" && requirement.constraints?.recipeCategory?.includes(metric)
        );

      case "reduce_waste":
        return metric === "waste_reduced";

      default: {
        const _: never = requirement.type;
        return false;
      }
    }
  }

  /**
   * Get challenges expiring soon (within 24 hours)
   */
  async getChallengesExpiringSoon(): Promise<ChallengeProgress[]> {
    try {
      const challenges = await this.challengeRepo.getChallengesExpiringSoon();
      const results = await this.getProgressBatch(challenges);
      return results.filter((p) => p.isActive);
    } catch (error) {
      log.error("Error getting challenges expiring soon:", error);
      return [];
    }
  }

  /**
   * Expire old challenges
   * Should be called periodically (e.g., daily)
   */
  async expireOldChallenges(): Promise<number> {
    try {
      const challengesToExpire = await this.userChallengeRepo.getChallengesToExpire();

      if (challengesToExpire.length === 0) {
        return 0;
      }

      const ids = challengesToExpire.map((c) => c.id);
      await this.userChallengeRepo.expireChallenges(ids);

      log.info(`Expired ${challengesToExpire.length} challenges`);
      return challengesToExpire.length;
    } catch (error) {
      log.error("Error expiring old challenges:", error);
      return 0;
    }
  }

  /**
   * Get total XP earned from challenges
   */
  async getTotalXPEarned(): Promise<number> {
    try {
      return await this.userChallengeRepo.getTotalXPEarned();
    } catch (error) {
      log.error("Error getting total XP earned:", error);
      return 0;
    }
  }

  /**
   * Get XP available from active challenges
   */
  async getAvailableXP(): Promise<number> {
    try {
      return await this.challengeRepo.getTotalXPAvailable();
    } catch (error) {
      log.error("Error getting available XP:", error);
      return 0;
    }
  }
}

// Singleton instance
export const challengeService = new ChallengeService();
