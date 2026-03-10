import { Q } from "@nozbe/watermelondb";
import Achievement, {
  type AchievementModelData,
} from "../models/Achievement";
import { BaseRepository, type SearchOptions } from "./BaseRepository";
import { database } from "../database";

export interface AchievementSearchOptions extends SearchOptions {
  type?: string; // milestone | streak | cumulative | special
  category?: string; // streak | recipes | ingredients | waste | social
  hidden?: boolean;
}

export class AchievementRepository extends BaseRepository<Achievement> {
  constructor() {
    super("achievement");
  }

  // Create a new achievement
  async createAchievement(
    data: AchievementModelData
  ): Promise<Achievement> {
    return await database.write(async () => {
      return await this.collection.create((record) => {
        record.type = data.type;
        record.category = data.category;
        record.title = data.title;
        record.description = data.description;
        record.icon = data.icon;
        record.requirement = data.requirement;
        if (data.reward) record.reward = data.reward;
        if (data.xp !== undefined) record.xp = data.xp;
        record.sortOrder = data.sortOrder;
        if (data.hidden !== undefined) record.hidden = data.hidden;
      });
    });
  }

  // Get achievements with optional filters
  async getAchievements(
    options: AchievementSearchOptions = {}
  ): Promise<Achievement[]> {
    let query = this.collection.query();

    // Filter by type
    if (options.type) {
      query = query.extend(Q.where("type", options.type));
    }

    // Filter by category
    if (options.category) {
      query = query.extend(Q.where("category", options.category));
    }

    // Filter by hidden status
    if (options.hidden !== undefined) {
      query = query.extend(Q.where("hidden", options.hidden ? 1 : 0));
    }

    // Apply sorting (sort order by default)
    query = this.applySorting(
      query,
      options.sortBy || "sort_order",
      options.sortOrder || "asc"
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

  // Get achievements by category
  async getAchievementsByCategory(
    category: string,
    includeHidden: boolean = false
  ): Promise<Achievement[]> {
    let query = this.collection.query(
      Q.where("category", category),
      Q.sortBy("sort_order", Q.asc)
    );

    if (!includeHidden) {
      query = query.extend(Q.where("hidden", 0));
    }

    return await query.fetch();
  }

  // Get achievements by type
  async getAchievementsByType(
    type: string,
    includeHidden: boolean = false
  ): Promise<Achievement[]> {
    let query = this.collection.query(
      Q.where("type", type),
      Q.sortBy("sort_order", Q.asc)
    );

    if (!includeHidden) {
      query = query.extend(Q.where("hidden", 0));
    }

    return await query.fetch();
  }

  // Get visible achievements (not hidden)
  async getVisibleAchievements(): Promise<Achievement[]> {
    return await this.collection
      .query(
        Q.where("hidden", 0),
        Q.sortBy("sort_order", Q.asc)
      )
      .fetch();
  }

  // Get hidden achievements
  async getHiddenAchievements(): Promise<Achievement[]> {
    return await this.collection
      .query(
        Q.where("hidden", 1),
        Q.sortBy("sort_order", Q.asc)
      )
      .fetch();
  }

  // Get achievement by type and category
  async getByTypeAndCategory(
    type: string,
    category: string
  ): Promise<Achievement[]> {
    return await this.collection
      .query(
        Q.where("type", type),
        Q.where("category", category),
        Q.sortBy("sort_order", Q.asc)
      )
      .fetch();
  }

  // Update achievement
  async updateAchievement(
    id: string,
    data: Partial<AchievementModelData>
  ): Promise<Achievement> {
    return await this.update(id, data);
  }

  // Get total XP available for all achievements
  async getTotalXPAvailable(): Promise<number> {
    const achievements = await this.collection.query().fetch();
    return achievements.reduce((total, achievement) => {
      return total + (achievement.xp ?? 0);
    }, 0);
  }

  // Get XP available for a specific category
  async getCategoryXPAvailable(category: string): Promise<number> {
    const achievements = await this.collection
      .query(Q.where("category", category))
      .fetch();
    return achievements.reduce((total, achievement) => {
      return total + (achievement.xp ?? 0);
    }, 0);
  }
}
