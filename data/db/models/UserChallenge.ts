import { Model, type Relation } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Challenge from "./Challenge";

export interface UserChallengeData {
  challengeId: string;
  status: string;
  progress: number;
  startedAt?: number;
  completedAt?: number;
  claimedAt?: number;
}

export default class UserChallenge extends Model {
  static table = "user_challenge";
  static associations: Associations = {
    challenge: { type: "belongs_to", key: "challenge_id" },
  };

  @field("challenge_id") challengeId!: string;
  @field("status") status!: string; // available | active | completed | expired
  @field("progress") progress!: number; // Current progress toward requirement target
  @field("started_at") startedAt?: number; // Timestamp when user started the challenge
  @field("completed_at") completedAt?: number; // Timestamp when challenge was completed
  @field("claimed_at") claimedAt?: number; // Timestamp when rewards were claimed

  @relation("challenge", "challenge_id") challenge!: Relation<Challenge>;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for started date
  get startedAtDate(): Date | undefined {
    return this.startedAt ? new Date(this.startedAt) : undefined;
  }

  // Computed property for completed date
  get completedAtDate(): Date | undefined {
    return this.completedAt ? new Date(this.completedAt) : undefined;
  }

  // Computed property for claimed date
  get claimedAtDate(): Date | undefined {
    return this.claimedAt ? new Date(this.claimedAt) : undefined;
  }

  // Check if challenge is available
  get isAvailable(): boolean {
    return this.status === "available";
  }

  // Check if challenge is active (in progress)
  get isActive(): boolean {
    return this.status === "active";
  }

  // Check if challenge is completed
  get isCompleted(): boolean {
    return this.status === "completed";
  }

  // Check if challenge is expired
  get isExpired(): boolean {
    return this.status === "expired";
  }

  // Check if rewards have been claimed
  get isClaimed(): boolean {
    return !!this.claimedAt;
  }

  // Format completed date for display
  get formattedCompletedAt(): string | undefined {
    if (!this.completedAt) return undefined;

    const date = this.completedAtDate!;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? "s" : ""} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? "s" : ""} ago`;
  }

  // Update method
  @writer async updateUserChallenge(data: Partial<UserChallengeData>): Promise<UserChallenge> {
    return this.update((record) => {
      if (data.challengeId !== undefined) record.challengeId = data.challengeId;
      if (data.status !== undefined) record.status = data.status;
      if (data.progress !== undefined) record.progress = data.progress;
      if (data.startedAt !== undefined) record.startedAt = data.startedAt;
      if (data.completedAt !== undefined) record.completedAt = data.completedAt;
      if (data.claimedAt !== undefined) record.claimedAt = data.claimedAt;
    });
  }

  // Increment progress
  @writer async incrementProgress(amount: number): Promise<UserChallenge> {
    return this.update((record) => {
      record.progress = (record.progress || 0) + amount;
    });
  }

  // Start the challenge
  @writer async start(): Promise<UserChallenge> {
    return this.update((record) => {
      record.status = "active";
      record.startedAt = Date.now();
    });
  }

  // Complete the challenge
  @writer async complete(): Promise<UserChallenge> {
    return this.update((record) => {
      record.status = "completed";
      record.completedAt = Date.now();
    });
  }

  // Claim rewards
  @writer async claim(): Promise<UserChallenge> {
    return this.update((record) => {
      record.claimedAt = Date.now();
    });
  }

  // Mark as expired
  @writer async expire(): Promise<UserChallenge> {
    return this.update((record) => {
      record.status = "expired";
    });
  }
}
