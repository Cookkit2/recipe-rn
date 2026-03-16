import { safeJsonParse } from "~/utils/json-parsing";
import { Model } from "@nozbe/watermelondb";
import { field, date, children, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import UserChallenge from "./UserChallenge";
import type { ChallengeRequirement, ChallengeReward } from "~/types/achievements";

export interface ChallengeData {
  type: string;
  title: string;
  description: string;
  requirement: string; // JSON stringified
  reward: string; // JSON stringified
  startDate: number;
  endDate: number;
  xp?: number;
}

export default class Challenge extends Model {
  static table = "challenge";
  static associations: Associations = {
    user_challenges: { type: "has_many", foreignKey: "challenge_id" },
  };

  @field("type") type!: string; // daily | weekly
  @field("title") title!: string;
  @field("description") description!: string;
  @field("requirement") requirement!: string; // JSON stringified ChallengeRequirement
  @field("reward") reward!: string; // JSON stringified ChallengeReward
  @field("start_date") startDate!: number; // Timestamp when challenge becomes available
  @field("end_date") endDate!: number; // Timestamp when challenge expires
  @field("xp") xp?: number; // XP reward for completion

  @children("user_challenges") userChallenges!: UserChallenge[];

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for start date
  get startDateDate(): Date {
    return new Date(this.startDate);
  }

  // Computed property for end date
  get endDateDate(): Date {
    return new Date(this.endDate);
  }

  // Computed property for parsed requirement
  get parsedRequirement(): ChallengeRequirement {
    return safeJsonParse<ChallengeRequirement>(this.requirement, {
      type: "cook_recipes",
      target: 0,
      description: "Unknown Requirement",
    });
  }

  // Computed property for parsed reward
  get parsedReward(): ChallengeReward {
    return safeJsonParse<ChallengeReward>(this.reward, { xp: 0 });
  }

  // Check if challenge is daily
  get isDaily(): boolean {
    return this.type === "daily";
  }

  // Check if challenge is weekly
  get isWeekly(): boolean {
    return this.type === "weekly";
  }

  // Get XP value (default to 0)
  get xpValue(): number {
    return this.xp ?? 0;
  }

  // Check if challenge is currently active (based on dates)
  get isActive(): boolean {
    const now = Date.now();
    return now >= this.startDate && now <= this.endDate;
  }

  // Check if challenge has expired
  get isExpired(): boolean {
    return Date.now() > this.endDate;
  }

  // Check if challenge is not yet available
  get isUpcoming(): boolean {
    return Date.now() < this.startDate;
  }

  // Get time remaining in milliseconds
  get timeRemaining(): number {
    return Math.max(0, this.endDate - Date.now());
  }

  // Format time remaining for display
  get formattedTimeRemaining(): string {
    const ms = this.timeRemaining;
    if (ms === 0) return "Expired";

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} remaining`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} remaining`;
    }
    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? "s" : ""} remaining`;
  }

  // Update method
  @writer async updateChallenge(data: Partial<ChallengeData>): Promise<Challenge> {
    return this.update((record) => {
      if (data.type !== undefined) record.type = data.type;
      if (data.title !== undefined) record.title = data.title;
      if (data.description !== undefined) record.description = data.description;
      if (data.requirement !== undefined) record.requirement = data.requirement;
      if (data.reward !== undefined) record.reward = data.reward;
      if (data.startDate !== undefined) record.startDate = data.startDate;
      if (data.endDate !== undefined) record.endDate = data.endDate;
      if (data.xp !== undefined) record.xp = data.xp;
    });
  }
}
