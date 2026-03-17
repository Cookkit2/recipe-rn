import { Model } from "@nozbe/watermelondb";
import { safeJsonParse } from "~/utils/json-parsing";
import { field, date, children, writer } from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import UserAchievement from "./UserAchievement";
import type { AchievementRequirement, AchievementReward } from "~/types/achievements";

export interface AchievementModelData {
  type: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  requirement: string; // JSON stringified
  reward?: string; // JSON stringified
  xp?: number;
  sortOrder: number;
  hidden?: boolean;
}

export default class Achievement extends Model {
  static table = "achievement";
  static associations: Associations = {
    user_achievements: { type: "has_many", foreignKey: "achievement_id" },
  };

  @field("type") type!: string; // milestone | streak | cumulative | special
  @field("category") category!: string; // streak | recipes | ingredients | waste | social
  @field("title") title!: string;
  @field("description") description!: string;
  @field("icon") icon!: string; // Emoji or icon name
  @field("requirement") requirement!: string; // JSON stringified AchievementRequirement
  @field("reward") reward?: string; // JSON stringified AchievementReward
  @field("xp") xp?: number;
  @field("sort_order") sortOrder!: number;
  @field("hidden") hidden?: boolean; // Hidden until unlocked

  @children("user_achievements") userAchievements!: UserAchievement[];

  @date("created_at") createdAt!: Date;
  @date("updated_at") updatedAt!: Date;

  // Computed property for parsed requirement
  get parsedRequirement(): AchievementRequirement {
    return safeJsonParse<AchievementRequirement>(this.requirement, {
      type: "special",
      target: 0,
    } as AchievementRequirement);
  }

  // Computed property for parsed reward
  get parsedReward(): AchievementReward | undefined {
    return safeJsonParse<AchievementReward | undefined>(this.reward, undefined);
  }

  // Check if achievement is hidden
  get isHidden(): boolean {
    return !!this.hidden;
  }

  // Get XP value (default to 0)
  get xpValue(): number {
    return this.xp ?? 0;
  }

  // Update method
  @writer async updateAchievement(data: Partial<AchievementModelData>): Promise<Achievement> {
    return this.update((record) => {
      if (data.type !== undefined) record.type = data.type;
      if (data.category !== undefined) record.category = data.category;
      if (data.title !== undefined) record.title = data.title;
      if (data.description !== undefined) record.description = data.description;
      if (data.icon !== undefined) record.icon = data.icon;
      if (data.requirement !== undefined) record.requirement = data.requirement;
      if (data.reward !== undefined) record.reward = data.reward;
      if (data.xp !== undefined) record.xp = data.xp;
      if (data.sortOrder !== undefined) record.sortOrder = data.sortOrder;
      if (data.hidden !== undefined) record.hidden = data.hidden;
    });
  }
}
