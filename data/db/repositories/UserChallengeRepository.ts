import { Q } from "@nozbe/watermelondb";
import Challenge from "../models/Challenge";
import UserChallenge, { type UserChallengeData } from "../models/UserChallenge";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface UserChallengeSearchOptions extends SearchOptions {
  status?: string; // available | active | completed | expired | claimed
  challengeId?: string;
  minProgress?: number;
  claimed?: boolean;
}

export class UserChallengeRepository extends BaseRepository<UserChallenge> {
  constructor() {
    super("user_challenge");
  }

  // Create or get user challenge for a specific challenge
  async getOrCreateForChallenge(challengeId: string): Promise<UserChallenge> {
    // First try to find existing
    const existing = await this.collection.query(Q.where("challenge_id", challengeId)).fetch();

    if (existing.length > 0) {
      return existing[0]!;
    }

    // Create new one
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.challengeId = challengeId;
        record.status = "available";
        record.progress = 0;
      });
    });
  }

  // Start a challenge
  async startChallenge(challengeId: string): Promise<UserChallenge> {
    const userChallenge = await this.getOrCreateForChallenge(challengeId);

    return await database.write(async () => {
      return await userChallenge.start();
    });
  }

  // Update progress for a user challenge
  async updateProgress(
    challengeId: string,
    progress: number,
    status?: string
  ): Promise<UserChallenge> {
    const userChallenge = await this.getOrCreateForChallenge(challengeId);

    return await database.write(async () => {
      return await userChallenge.update((record) => {
        record.progress = progress;
        if (status) {
          record.status = status;
        }
      });
    });
  }

  // Increment progress for a user challenge
  async incrementProgress(challengeId: string, amount: number = 1): Promise<UserChallenge> {
    const userChallenge = await this.getOrCreateForChallenge(challengeId);

    return await database.write(async () => {
      return await userChallenge.incrementProgress(amount);
    });
  }

  // Complete a challenge
  async completeChallenge(challengeId: string): Promise<UserChallenge> {
    const userChallenge = await this.getOrCreateForChallenge(challengeId);

    return await database.write(async () => {
      return await userChallenge.complete();
    });
  }

  // Claim rewards for a completed challenge
  async claimRewards(challengeId: string): Promise<UserChallenge> {
    const userChallenge = await this.getOrCreateForChallenge(challengeId);

    return await database.write(async () => {
      return await userChallenge.claim();
    });
  }

  // Mark challenge as expired
  async expireChallenge(challengeId: string): Promise<UserChallenge> {
    const userChallenge = await this.getOrCreateForChallenge(challengeId);

    return await database.write(async () => {
      return await userChallenge.expire();
    });
  }

  // Get user challenges with optional filters
  async getUserChallenges(options: UserChallengeSearchOptions = {}): Promise<UserChallenge[]> {
    let query = this.collection.query();

    // Filter by status
    if (options.status) {
      query = query.extend(Q.where("status", options.status));
    }

    // Filter by challenge
    if (options.challengeId) {
      query = query.extend(Q.where("challenge_id", options.challengeId));
    }

    // Filter by minimum progress
    if (options.minProgress !== undefined) {
      query = query.extend(Q.where("progress", Q.gte(options.minProgress)));
    }

    // Apply sorting (most recently created first by default)
    query = this.applySorting(query, options.sortBy || "created_at", options.sortOrder || "desc");

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    let records = await query.fetch();

    // Post-process filters that can't be done in SQL
    if (options.claimed === true) {
      records = records.filter((r) => r.isClaimed);
    } else if (options.claimed === false) {
      records = records.filter((r) => !r.isClaimed);
    }

    return records;
  }

  // Get available challenges
  async getAvailableChallenges(): Promise<UserChallenge[]> {
    return await this.collection
      .query(Q.where("status", "available"), Q.sortBy("created_at", Q.desc))
      .fetch();
  }

  // Get active (in progress) challenges
  async getActiveChallenges(): Promise<UserChallenge[]> {
    return await this.collection
      .query(Q.where("status", "active"), Q.sortBy("started_at", Q.desc))
      .fetch();
  }

  // Get completed challenges
  async getCompletedChallenges(): Promise<UserChallenge[]> {
    return await this.collection
      .query(Q.where("status", "completed"), Q.sortBy("completed_at", Q.desc))
      .fetch();
  }

  // Get expired challenges
  async getExpiredChallenges(): Promise<UserChallenge[]> {
    return await this.collection
      .query(Q.where("status", "expired"), Q.sortBy("created_at", Q.desc))
      .fetch();
  }

  // Get unclaimed completed challenges (completed but not claimed)
  async getUnclaimedChallenges(): Promise<UserChallenge[]> {
    const completed = await this.getCompletedChallenges();
    return completed.filter((c) => !c.isClaimed);
  }

  // Get user challenge for a specific challenge
  async getByChallengeId(challengeId: string): Promise<UserChallenge | null> {
    const results = await this.collection.query(Q.where("challenge_id", challengeId)).fetch();

    return results.length > 0 ? results[0]! : null;
  }

  // Get recently completed challenges
  async getRecentlyCompleted(limit: number = 10): Promise<UserChallenge[]> {
    return await this.collection
      .query(Q.where("status", "completed"), Q.sortBy("completed_at", Q.desc), Q.take(limit))
      .fetch();
  }

  // Count challenges by status
  async countByStatus(status: string): Promise<number> {
    return await this.collection.query(Q.where("status", status)).fetchCount();
  }

  // Get total XP earned from completed challenges
  // Note: This requires joining with challenge table to get XP values
  async getTotalXPEarned(): Promise<number> {
    const completedChallenges = await this.getCompletedChallenges();
    if (completedChallenges.length === 0) return 0;

    // Extract unique challenge IDs
    const challengeIds = [...new Set(completedChallenges.map((uc) => uc.challengeId))];

    // Fetch all related challenges in one query to avoid N+1 problem
    const challenges = await database.collections
      .get<Challenge>("challenge")
      .query(Q.where("id", Q.oneOf(challengeIds)))
      .fetch();

    // Create a lookup map for O(1) access
    const challengeMap = new Map(challenges.map((c) => [c.id, c.xpValue]));

    let totalXP = 0;
    for (const userChallenge of completedChallenges) {
      const xp = challengeMap.get(userChallenge.challengeId) || 0;
      totalXP += xp;
    }

    return totalXP;
  }

  // Update user challenge
  async updateUserChallenge(id: string, data: Partial<UserChallengeData>): Promise<UserChallenge> {
    return await this.update(id, data);
  }

  // Check and update challenge status based on progress
  // This would typically be called with the challenge's requirement target
  async checkAndUpdateStatus(
    challengeId: string,
    currentProgress: number,
    targetProgress: number
  ): Promise<UserChallenge> {
    const userChallenge = await this.getOrCreateForChallenge(challengeId);

    let newStatus = userChallenge.status;
    if (currentProgress >= targetProgress && userChallenge.status !== "completed") {
      newStatus = "completed";
    } else if (currentProgress > 0 && userChallenge.status === "available") {
      newStatus = "active";
    }

    return await database.write(async () => {
      return await userChallenge.update((record) => {
        record.progress = currentProgress;
        record.status = newStatus;
        if (newStatus === "active" && !record.startedAt) {
          record.startedAt = Date.now();
        }
        if (newStatus === "completed" && !record.completedAt) {
          record.completedAt = Date.now();
        }
      });
    });
  }

  // Get challenges that need to be expired
  // (active or available challenges whose parent challenge has expired)
  async getChallengesToExpire(): Promise<UserChallenge[]> {
    const allUserChallenges = await this.collection
      .query(Q.or(Q.where("status", "available"), Q.where("status", "active")))
      .fetch();

    const challengesToExpire: UserChallenge[] = [];

    for (const userChallenge of allUserChallenges) {
      const challenge = await userChallenge.challenge.fetch();
      if (challenge.isExpired) {
        challengesToExpire.push(userChallenge);
      }
    }

    return challengesToExpire;
  }

  // Bulk expire challenges
  async expireChallenges(userChallengeIds: string[]): Promise<void> {
    await database.write(async () => {
      for (const id of userChallengeIds) {
        const record = await this.collection.find(id);
        await record.update((r) => {
          r.status = "expired";
        });
      }
    });
  }

  // Get active challenge count
  async getActiveCount(): Promise<number> {
    return await this.countByStatus("active");
  }

  // Get completed challenge count
  async getCompletedCount(): Promise<number> {
    return await this.countByStatus("completed");
  }

  // Get unclaimed completed challenge count
  async getUnclaimedCount(): Promise<number> {
    const unclaimed = await this.getUnclaimedChallenges();
    return unclaimed.length;
  }
}
