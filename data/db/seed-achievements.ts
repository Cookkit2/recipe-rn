/**
 * Achievement Seeding Data
 *
 * Predefined achievement definitions for gamification system.
 * These are seeded into the database on app initialization.
 */

import { database } from "./database";
import type { AchievementRequirement, AchievementReward } from "~/types/achievements";
import { log } from "~/utils/logger";

/**
 * Helper to create a streak requirement
 */
function streakRequirement(days: number): string {
  return JSON.stringify({
    type: "streak",
    target: days,
    metric: "consecutive_days",
    timeframe: "all_time",
  } as AchievementRequirement);
}

/**
 * Helper to create a count requirement
 */
function countRequirement(target: number, metric: string): string {
  return JSON.stringify({
    type: "count",
    target,
    metric,
    timeframe: "all_time",
  } as AchievementRequirement);
}

/**
 * Helper to create a cumulative requirement
 */
function cumulativeRequirement(target: number, metric: string): string {
  return JSON.stringify({
    type: "cumulative",
    target,
    metric,
    timeframe: "all_time",
  } as AchievementRequirement);
}

/**
 * Helper to create a reward (optional)
 */
function createReward(type: string, value: string, description?: string): string {
  return JSON.stringify({
    type,
    value,
    description,
  } as AchievementReward);
}

/**
 * Initial achievement definitions to seed
 */
export const initialAchievements = [
  // ========================================
  // STREAK ACHIEVEMENTS
  // ========================================
  {
    type: "streak",
    category: "streak",
    title: "First Flame",
    description: "Cook for 3 consecutive days",
    icon: "🔥",
    requirement: streakRequirement(3),
    reward: createReward("badge", "novice_cook", "Novice Cook Badge"),
    xp: 50,
    sort_order: 1,
    hidden: false,
  },
  {
    type: "streak",
    category: "streak",
    title: "Heating Up",
    description: "Cook for 7 consecutive days",
    icon: "🔥",
    requirement: streakRequirement(7),
    reward: createReward("badge", "dedicated_cook", "Dedicated Cook Badge"),
    xp: 100,
    sort_order: 2,
    hidden: false,
  },
  {
    type: "streak",
    category: "streak",
    title: "On Fire!",
    description: "Cook for 14 consecutive days",
    icon: "🔥",
    requirement: streakRequirement(14),
    reward: createReward("badge", "cooking_enthusiast", "Cooking Enthusiast Badge"),
    xp: 200,
    sort_order: 3,
    hidden: false,
  },
  {
    type: "streak",
    category: "streak",
    title: "Kitchen Master",
    description: "Cook for 30 consecutive days",
    icon: "👨‍🍳",
    requirement: streakRequirement(30),
    reward: createReward("badge", "kitchen_master", "Kitchen Master Badge"),
    xp: 500,
    sort_order: 4,
    hidden: false,
  },
  {
    type: "streak",
    category: "streak",
    title: "Legendary Streak",
    description: "Cook for 100 consecutive days",
    icon: "🏆",
    requirement: streakRequirement(100),
    reward: createReward("badge", "legendary_cook", "Legendary Cook Badge"),
    xp: 2000,
    sort_order: 5,
    hidden: false,
  },

  // ========================================
  // RECIPE MILESTONES
  // ========================================
  {
    type: "milestone",
    category: "recipes",
    title: "First Recipe",
    description: "Cook your first recipe",
    icon: "🍳",
    requirement: countRequirement(1, "recipes_cooked"),
    reward: createReward("badge", "first_recipe", "First Recipe Badge"),
    xp: 25,
    sort_order: 10,
    hidden: false,
  },
  {
    type: "milestone",
    category: "recipes",
    title: "Recipe Explorer",
    description: "Cook 5 different recipes",
    icon: "🍳",
    requirement: countRequirement(5, "recipes_cooked"),
    reward: createReward("badge", "recipe_explorer", "Recipe Explorer Badge"),
    xp: 75,
    sort_order: 11,
    hidden: false,
  },
  {
    type: "milestone",
    category: "recipes",
    title: "Home Chef",
    description: "Cook 25 different recipes",
    icon: "👨‍🍳",
    requirement: countRequirement(25, "recipes_cooked"),
    reward: createReward("badge", "home_chef", "Home Chef Badge"),
    xp: 250,
    sort_order: 12,
    hidden: false,
  },
  {
    type: "milestone",
    category: "recipes",
    title: "Recipe Master",
    description: "Cook 50 different recipes",
    icon: "🏆",
    requirement: countRequirement(50, "recipes_cooked"),
    reward: createReward("badge", "recipe_master", "Recipe Master Badge"),
    xp: 500,
    sort_order: 13,
    hidden: false,
  },
  {
    type: "milestone",
    category: "recipes",
    title: "Culinary Legend",
    description: "Cook 100 different recipes",
    icon: "⭐",
    requirement: countRequirement(100, "recipes_cooked"),
    reward: createReward("badge", "culinary_legend", "Culinary Legend Badge"),
    xp: 1000,
    sort_order: 14,
    hidden: false,
  },

  // ========================================
  // INGREDIENT TRACKING
  // ========================================
  {
    type: "cumulative",
    category: "ingredients",
    title: "Pantry Starter",
    description: "Track your first 10 ingredients",
    icon: "🥬",
    requirement: cumulativeRequirement(10, "ingredients_tracked"),
    xp: 30,
    sort_order: 20,
    hidden: false,
  },
  {
    type: "cumulative",
    category: "ingredients",
    title: "Stocked Up",
    description: "Track 50 different ingredients",
    icon: "📦",
    requirement: cumulativeRequirement(50, "ingredients_tracked"),
    xp: 100,
    sort_order: 21,
    hidden: false,
  },
  {
    type: "cumulative",
    category: "ingredients",
    title: "Ingredient Expert",
    description: "Track 100 different ingredients",
    icon: "🧺",
    requirement: cumulativeRequirement(100, "ingredients_tracked"),
    xp: 200,
    sort_order: 22,
    hidden: false,
  },
  {
    type: "cumulative",
    category: "ingredients",
    title: "Pantry Hoarder",
    description: "Track 250 different ingredients",
    icon: "🏪",
    requirement: cumulativeRequirement(250, "ingredients_tracked"),
    xp: 500,
    sort_order: 23,
    hidden: false,
  },

  // ========================================
  // WASTE REDUCTION
  // ========================================
  {
    type: "cumulative",
    category: "waste",
    title: "Eco-Conscious",
    description: "Use 10 ingredients before they expire",
    icon: "♻️",
    requirement: cumulativeRequirement(10, "ingredients_used_before_expiry"),
    xp: 50,
    sort_order: 30,
    hidden: false,
  },
  {
    type: "cumulative",
    category: "waste",
    title: "Waste Warrior",
    description: "Use 50 ingredients before they expire",
    icon: "🌱",
    requirement: cumulativeRequirement(50, "ingredients_used_before_expiry"),
    xp: 200,
    sort_order: 31,
    hidden: false,
  },
  {
    type: "cumulative",
    category: "waste",
    title: "Zero Waste Hero",
    description: "Use 100 ingredients before they expire",
    icon: "🌍",
    requirement: cumulativeRequirement(100, "ingredients_used_before_expiry"),
    reward: createReward("badge", "zero_waste_hero", "Zero Waste Hero Badge"),
    xp: 500,
    sort_order: 32,
    hidden: false,
  },

  // ========================================
  // SOCIAL SHARING
  // ========================================
  {
    type: "special",
    category: "social",
    title: "Sharing is Caring",
    description: "Share your first achievement",
    icon: "🎉",
    requirement: countRequirement(1, "achievements_shared"),
    xp: 25,
    sort_order: 40,
    hidden: false,
  },
  {
    type: "special",
    category: "social",
    title: "Show Off",
    description: "Share 5 achievements",
    icon: "📸",
    requirement: countRequirement(5, "achievements_shared"),
    xp: 75,
    sort_order: 41,
    hidden: false,
  },
  {
    type: "special",
    category: "social",
    title: "Social Butterfly",
    description: "Share 10 achievements",
    icon: "🦋",
    requirement: countRequirement(10, "achievements_shared"),
    reward: createReward("badge", "social_butterfly", "Social Butterfly Badge"),
    xp: 150,
    sort_order: 42,
    hidden: false,
  },

  // ========================================
  // SPECIAL/SECRET ACHIEVEMENTS
  // ========================================
  {
    type: "special",
    category: "recipes",
    title: "Breakfast Champion",
    description: "Cook 10 breakfast recipes",
    icon: "🥞",
    requirement: countRequirement(10, "breakfast_recipes_cooked"),
    xp: 150,
    sort_order: 50,
    hidden: false,
  },
  {
    type: "special",
    category: "recipes",
    title: "Dinner Expert",
    description: "Cook 20 dinner recipes",
    icon: "🍽️",
    requirement: countRequirement(20, "dinner_recipes_cooked"),
    xp: 200,
    sort_order: 51,
    hidden: false,
  },
  {
    type: "special",
    category: "ingredients",
    title: "Spice Master",
    description: "Track 25 different spices and seasonings",
    icon: "🌶️",
    requirement: cumulativeRequirement(25, "spices_tracked"),
    xp: 100,
    sort_order: 52,
    hidden: false,
  },
];

/**
 * Seed achievements into the database
 */
export async function seedAchievements(): Promise<void> {
  try {
    log.info("🏆 Seeding achievements...");

    const achievements = database.collections.get("achievement");

    // Check if achievements already exist
    const existingCount = await achievements.query().fetchCount();
    if (existingCount > 0) {
      log.info(`✅ Achievements already exist (${existingCount} found), skipping seed`);
      return;
    }

    // Batch create all achievements
    await database.batch(
      initialAchievements.map((achievement) =>
        achievements.prepareCreate((record: any) => {
          record.type = achievement.type;
          record.category = achievement.category;
          record.title = achievement.title;
          record.description = achievement.description;
          record.icon = achievement.icon;
          record.requirement = achievement.requirement;
          record.reward = achievement.reward;
          record.xp = achievement.xp;
          record.sortOrder = achievement.sort_order;
          record.hidden = achievement.hidden ?? false;
          record.createdAt = Date.now();
          record.updatedAt = Date.now();
        })
      )
    );

    log.info(`✅ Seeded ${initialAchievements.length} achievements`);
  } catch (error) {
    log.error("❌ Error seeding achievements:", error);
    throw error;
  }
}
