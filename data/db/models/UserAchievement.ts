import { Model } from "@nozbe/watermelondb";
import { field, date, relation, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import Achievement from "./Achievement";

export interface UserAchievementData {
  achievementId: string;
  status: string;
  progress: number;
  unlockedAt?: number;
  lastCheckedAt: number;
}

export default class UserAchievement extends Model {
  static table = "user_achievement";
  static associations: Associations = {
    achievement: { type: "belongs_to", key: "achievement_id" },
  };

  @field("achievement_id") achievementId!: string;
  @field("status") status!: string; // locked | unlocked | in_progress
  @field("progress") progress!: number; // Current progress toward requirement
  @field("unlocked_at") unlockedAt?: number; // Timestamp when unlocked
  @field("last_checked_at") lastCheckedAt!: number; // Timestamp of last progress check

  @relation("achievement", "achievement_id") achievement!: Achievement;

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for unlocked date
  get unlockedAtDate(): Date | undefined {
    return this.unlockedAt ? new Date(this.unlockedAt) : undefined;
  }

  // Computed property for last checked date
  get lastCheckedAtDate(): Date {
    return new Date(this.lastCheckedAt);
  }

  // Check if achievement is unlocked
  get isUnlocked(): boolean {
    return this.status === "unlocked";
  }

  // Check if achievement is in progress
  get isInProgress(): boolean {
    return this.status === "in_progress";
  }

  // Check if achievement is locked
  get isLocked(): boolean {
    return this.status === "locked";
  }

  // Format unlocked date for display
  get formattedUnlockedAt(): string | undefined {
    if (!this.unlockedAt) return undefined;

    const date = this.unlockedAtDate!;
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

  // Calculate progress percentage (requires achievement to be loaded)
  get progressPercentage(): number {
    // This will need the achievement's requirement.target to calculate properly
    // For now, return a placeholder
    return 0;
  }

  // Update method
  @writer async updateUserAchievement(
    data: Partial<UserAchievementData>
  ): Promise<UserAchievement> {
    return this.update((record) => {
      if (data.achievementId !== undefined) record.achievementId = data.achievementId;
      if (data.status !== undefined) record.status = data.status;
      if (data.progress !== undefined) record.progress = data.progress;
      if (data.unlockedAt !== undefined) record.unlockedAt = data.unlockedAt;
      if (data.lastCheckedAt !== undefined) record.lastCheckedAt = data.lastCheckedAt;
    });
  }

  // Increment progress
  @writer async incrementProgress(amount: number): Promise<UserAchievement> {
    return this.update((record) => {
      record.progress = (record.progress || 0) + amount;
      record.lastCheckedAt = Date.now();
    });
  }

  // Unlock achievement
  @writer async unlock(): Promise<UserAchievement> {
    return this.update((record) => {
      record.status = "unlocked";
      record.unlockedAt = Date.now();
      record.lastCheckedAt = Date.now();
    });
  }
}
