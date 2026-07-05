import { Q } from "@nozbe/watermelondb";
import Challenge, { type ChallengeData } from "../models/Challenge";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface ChallengeSearchOptions extends SearchOptions {
  type?: string; // daily | weekly
  active?: boolean;
  expired?: boolean;
  upcoming?: boolean;
}

export class ChallengeRepository extends BaseRepository<Challenge> {
  constructor() {
    super("challenge");
  }

  // Create a new challenge
  async createChallenge(data: ChallengeData): Promise<Challenge> {
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.type = data.type;
        record.title = data.title;
        record.description = data.description;
        record.requirement = data.requirement;
        record.reward = data.reward;
        record.startDate = data.startDate;
        record.endDate = data.endDate;
        if (data.xp !== undefined) record.xp = data.xp;
      });
    });
  }

  // Get challenges with optional filters

  // Get multiple challenges by IDs
  async getByIds(ids: string[]): Promise<Challenge[]> {
    if (ids.length === 0) return [];
    return await this.collection.query(Q.where("id", Q.oneOf(ids))).fetch();
  }

  // Get challenge by ID
  async getChallengeById(id: string): Promise<Challenge | null> {
    return await this.findById(id);
  }

  async getChallenges(options: ChallengeSearchOptions = {}): Promise<Challenge[]> {
    let query = this.collection.query();

    // Filter by type
    if (options.type) {
      query = query.extend(Q.where("type", options.type));
    }

    // Apply sorting (start date descending by default to show newest first)
    query = this.applySorting(query, options.sortBy || "start_date", options.sortOrder || "desc");

    // Apply pagination
    if (options.offset) {
      query = query.extend(Q.skip(options.offset));
    }
    if (options.limit) {
      query = query.extend(Q.take(options.limit));
    }

    let records = await query.fetch();

    // ⚡ Bolt Performance Optimization:
    // Prevent multiple intermediate array allocations by filtering
    // through all post-process conditions in a single pass.
    if (
      options.active !== undefined ||
      options.expired !== undefined ||
      options.upcoming !== undefined
    ) {
      const filteredRecords: typeof records = [];
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (!r) continue;

        let keep = true;

        if (options.active === true && !r.isActive) keep = false;
        else if (options.active === false && r.isActive) keep = false;

        if (options.expired === true && !r.isExpired) keep = false;
        else if (options.expired === false && r.isExpired) keep = false;

        if (options.upcoming === true && !r.isUpcoming) keep = false;
        else if (options.upcoming === false && r.isUpcoming) keep = false;

        if (keep) {
          filteredRecords.push(r);
        }
      }
      records = filteredRecords;
    }

    return records;
  }

  // Get currently active challenges
  async getActiveChallenges(): Promise<Challenge[]> {
    const allChallenges = await this.collection.query().fetch();
    return allChallenges.filter((c) => c.isActive);
  }

  // Get expired challenges
  async getExpiredChallenges(): Promise<Challenge[]> {
    const allChallenges = await this.collection.query().fetch();
    return allChallenges.filter((c) => c.isExpired);
  }

  // Get upcoming challenges
  async getUpcomingChallenges(): Promise<Challenge[]> {
    const allChallenges = await this.collection.query().fetch();
    return allChallenges.filter((c) => c.isUpcoming);
  }

  // Get daily challenges
  async getDailyChallenges(): Promise<Challenge[]> {
    return await this.collection.query(Q.where("type", "daily")).fetch();
  }

  // Get weekly challenges
  async getWeeklyChallenges(): Promise<Challenge[]> {
    return await this.collection.query(Q.where("type", "weekly")).fetch();
  }

  // Get active daily challenges
  async getActiveDailyChallenges(): Promise<Challenge[]> {
    const allDaily = await this.getDailyChallenges();
    return allDaily.filter((c) => c.isActive);
  }

  // Get active weekly challenges
  async getActiveWeeklyChallenges(): Promise<Challenge[]> {
    const allWeekly = await this.getWeeklyChallenges();
    return allWeekly.filter((c) => c.isActive);
  }

  // Update challenge
  async updateChallenge(id: string, data: Partial<ChallengeData>): Promise<Challenge> {
    return await this.update(id, data);
  }

  // Delete challenge
  async deleteChallenge(id: string): Promise<boolean> {
    try {
      await this.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  // Get total XP available for all active challenges
  async getTotalXPAvailable(): Promise<number> {
    const activeChallenges = await this.getActiveChallenges();
    return activeChallenges.reduce((total, challenge) => {
      return total + challenge.xpValue;
    }, 0);
  }

  // Get XP available for daily challenges
  async getDailyXPAvailable(): Promise<number> {
    const dailyChallenges = await this.getActiveDailyChallenges();
    return dailyChallenges.reduce((total, challenge) => {
      return total + challenge.xpValue;
    }, 0);
  }

  // Get XP available for weekly challenges
  async getWeeklyXPAvailable(): Promise<number> {
    const weeklyChallenges = await this.getActiveWeeklyChallenges();
    return weeklyChallenges.reduce((total, challenge) => {
      return total + challenge.xpValue;
    }, 0);
  }

  // Get challenges expiring soon (within 24 hours)
  async getChallengesExpiringSoon(): Promise<Challenge[]> {
    const allChallenges = await this.collection.query().fetch();
    const twentyFourHoursFromNow = Date.now() + 24 * 60 * 60 * 1000;

    return allChallenges.filter((c) => {
      return c.isActive && c.endDate <= twentyFourHoursFromNow;
    });
  }
}
