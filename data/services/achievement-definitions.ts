/**
 * Achievement Definitions
 *
 * Shared achievement definitions, thresholds, and criteria for the gamification system.
 * This file contains centralized definitions of achievement requirements that are used
 * by AchievementService and can be referenced throughout the app.
 */

import type { AchievementRequirement } from "~/types/achievements";

// ============================================
// STREAK ACHIEVEMENT THRESHOLDS
// ============================================

/**
 * Streak achievement thresholds in consecutive days
 */
export const STREAK_ACHIEVEMENTS = {
  FIRST_FLAME: 3,
  HEATING_UP: 7,
  ON_FIRE: 14,
  KITCHEN_MASTER: 30,
  LEGENDARY_STREAK: 100,
} as const;

/**
 * All streak milestone values sorted by threshold
 */
export const STREAK_MILESTONES = [3, 7, 14, 30, 100] as const;

/**
 * Streak achievement definitions with metadata
 */
export const STREAK_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "streak_3_days",
    threshold: STREAK_ACHIEVEMENTS.FIRST_FLAME,
    title: "First Flame",
    description: "Cook for 3 consecutive days",
    icon: "🔥",
    xp: 50,
  },
  {
    id: "streak_7_days",
    threshold: STREAK_ACHIEVEMENTS.HEATING_UP,
    title: "Heating Up",
    description: "Cook for 7 consecutive days",
    icon: "🔥",
    xp: 100,
  },
  {
    id: "streak_14_days",
    threshold: STREAK_ACHIEVEMENTS.ON_FIRE,
    title: "On Fire!",
    description: "Cook for 14 consecutive days",
    icon: "🔥",
    xp: 200,
  },
  {
    id: "streak_30_days",
    threshold: STREAK_ACHIEVEMENTS.KITCHEN_MASTER,
    title: "Kitchen Master",
    description: "Cook for 30 consecutive days",
    icon: "👨‍🍳",
    xp: 500,
  },
  {
    id: "streak_100_days",
    threshold: STREAK_ACHIEVEMENTS.LEGENDARY_STREAK,
    title: "Legendary Streak",
    description: "Cook for 100 consecutive days",
    icon: "🏆",
    xp: 2000,
  },
] as const;

// ============================================
// RECIPE MILESTONES
// ============================================

/**
 * Recipe milestone thresholds
 */
export const RECIPE_MILESTONES = {
  FIRST_RECIPE: 1,
  RECIPE_EXPLORER: 5,
  HOME_CHEF: 25,
  RECIPE_MASTER: 50,
  CULINARY_LEGEND: 100,
} as const;

/**
 * All recipe milestone values sorted by threshold
 */
export const RECIPE_COUNT_THRESHOLDS = [1, 5, 25, 50, 100] as const;

/**
 * Recipe milestone definitions with metadata
 */
export const RECIPE_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "recipes_1",
    threshold: RECIPE_MILESTONES.FIRST_RECIPE,
    title: "First Recipe",
    description: "Cook your first recipe",
    icon: "🍳",
    xp: 25,
  },
  {
    id: "recipes_5",
    threshold: RECIPE_MILESTONES.RECIPE_EXPLORER,
    title: "Recipe Explorer",
    description: "Cook 5 different recipes",
    icon: "🍳",
    xp: 75,
  },
  {
    id: "recipes_25",
    threshold: RECIPE_MILESTONES.HOME_CHEF,
    title: "Home Chef",
    description: "Cook 25 different recipes",
    icon: "👨‍🍳",
    xp: 250,
  },
  {
    id: "recipes_50",
    threshold: RECIPE_MILESTONES.RECIPE_MASTER,
    title: "Recipe Master",
    description: "Cook 50 different recipes",
    icon: "🏆",
    xp: 500,
  },
  {
    id: "recipes_100",
    threshold: RECIPE_MILESTONES.CULINARY_LEGEND,
    title: "Culinary Legend",
    description: "Cook 100 different recipes",
    icon: "⭐",
    xp: 1000,
  },
] as const;

// ============================================
// INGREDIENT TRACKING MILESTONES
// ============================================

/**
 * Ingredient tracking thresholds
 */
export const INGREDIENT_TRACKING_MILESTONES = {
  PANTRY_STARTER: 10,
  STOCKED_UP: 50,
  INGREDIENT_EXPERT: 100,
  PANTRY_HOARDER: 250,
} as const;

/**
 * All ingredient tracking milestone values sorted by threshold
 */
export const INGREDIENT_COUNT_THRESHOLDS = [10, 50, 100, 250] as const;

/**
 * Ingredient tracking achievement definitions with metadata
 */
export const INGREDIENT_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "ingredients_10",
    threshold: INGREDIENT_TRACKING_MILESTONES.PANTRY_STARTER,
    title: "Pantry Starter",
    description: "Track your first 10 ingredients",
    icon: "🥬",
    xp: 30,
  },
  {
    id: "ingredients_50",
    threshold: INGREDIENT_TRACKING_MILESTONES.STOCKED_UP,
    title: "Stocked Up",
    description: "Track 50 different ingredients",
    icon: "📦",
    xp: 100,
  },
  {
    id: "ingredients_100",
    threshold: INGREDIENT_TRACKING_MILESTONES.INGREDIENT_EXPERT,
    title: "Ingredient Expert",
    description: "Track 100 different ingredients",
    icon: "🧺",
    xp: 200,
  },
  {
    id: "ingredients_250",
    threshold: INGREDIENT_TRACKING_MILESTONES.PANTRY_HOARDER,
    title: "Pantry Hoarder",
    description: "Track 250 different ingredients",
    icon: "🏪",
    xp: 500,
  },
] as const;

// ============================================
// WASTE REDUCTION MILESTONES
// ============================================

/**
 * Waste reduction thresholds (ingredients used before expiry)
 */
export const WASTE_REDUCTION_MILESTONES = {
  ECO_CONSCIOUS: 10,
  WASTE_WARRIOR: 50,
  ZERO_WASTE_HERO: 100,
} as const;

/**
 * All waste reduction milestone values sorted by threshold
 */
export const WASTE_REDUCTION_THRESHOLDS = [10, 50, 100] as const;

/**
 * Waste reduction achievement definitions with metadata
 */
export const WASTE_REDUCTION_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "waste_10",
    threshold: WASTE_REDUCTION_MILESTONES.ECO_CONSCIOUS,
    title: "Eco-Conscious",
    description: "Use 10 ingredients before they expire",
    icon: "♻️",
    xp: 50,
  },
  {
    id: "waste_50",
    threshold: WASTE_REDUCTION_MILESTONES.WASTE_WARRIOR,
    title: "Waste Warrior",
    description: "Use 50 ingredients before they expire",
    icon: "🌱",
    xp: 200,
  },
  {
    id: "waste_100",
    threshold: WASTE_REDUCTION_MILESTONES.ZERO_WASTE_HERO,
    title: "Zero Waste Hero",
    description: "Use 100 ingredients before they expire",
    icon: "🌍",
    xp: 500,
  },
] as const;

// ============================================
// SOCIAL SHARING MILESTONES
// ============================================

/**
 * Social sharing thresholds (achievements shared)
 */
export const SOCIAL_SHARING_MILESTONES = {
  FIRST_SHARE: 1,
  SHOW_OFF: 5,
  SOCIAL_BUTTERFLY: 10,
} as const;

/**
 * All social sharing milestone values sorted by threshold
 */
export const SOCIAL_SHARING_THRESHOLDS = [1, 5, 10] as const;

/**
 * Social sharing achievement definitions with metadata
 */
export const SOCIAL_SHARING_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "social_1",
    threshold: SOCIAL_SHARING_MILESTONES.FIRST_SHARE,
    title: "Sharing is Caring",
    description: "Share your first achievement",
    icon: "🎉",
    xp: 25,
  },
  {
    id: "social_5",
    threshold: SOCIAL_SHARING_MILESTONES.SHOW_OFF,
    title: "Show Off",
    description: "Share 5 achievements",
    icon: "📸",
    xp: 75,
  },
  {
    id: "social_10",
    threshold: SOCIAL_SHARING_MILESTONES.SOCIAL_BUTTERFLY,
    title: "Social Butterfly",
    description: "Share 10 achievements",
    icon: "🦋",
    xp: 150,
  },
] as const;

// ============================================
// SPECIAL ACHIEVEMENT DEFINITIONS
// ============================================

/**
 * Special category-specific achievements
 */
export const SPECIAL_ACHIEVEMENT_DEFINITIONS = [
  {
    id: "breakfast_10",
    category: "breakfast",
    metric: "breakfast_recipes_cooked",
    threshold: 10,
    title: "Breakfast Champion",
    description: "Cook 10 breakfast recipes",
    icon: "🥞",
    xp: 150,
  },
  {
    id: "dinner_20",
    category: "dinner",
    metric: "dinner_recipes_cooked",
    threshold: 20,
    title: "Dinner Expert",
    description: "Cook 20 dinner recipes",
    icon: "🍽️",
    xp: 200,
  },
  {
    id: "spices_25",
    category: "spices",
    metric: "spices_tracked",
    threshold: 25,
    title: "Spice Master",
    description: "Track 25 different spices and seasonings",
    icon: "🌶️",
    xp: 100,
  },
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the next milestone for a given value and milestone array
 * @param currentValue - Current progress value
 * @param milestones - Array of milestone thresholds (sorted ascending)
 * @returns Next milestone to reach, or null if all milestones passed
 */
export function getNextMilestone(
  currentValue: number,
  milestones: readonly number[]
): number | null {
  for (const milestone of milestones) {
    if (currentValue < milestone) {
      return milestone;
    }
  }
  return null;
}

/**
 * Get the previous milestone achieved for a given value and milestone array
 * @param currentValue - Current progress value
 * @param milestones - Array of milestone thresholds (sorted ascending)
 * @returns Previous milestone achieved, or null if no milestones reached
 */
export function getPreviousMilestone(
  currentValue: number,
  milestones: readonly number[]
): number | null {
  let previous: number | null = null;
  for (const milestone of milestones) {
    if (currentValue >= milestone) {
      previous = milestone;
    } else {
      break;
    }
  }
  return previous;
}

/**
 * Calculate progress percentage toward a milestone
 * @param currentValue - Current progress value
 * @param targetMilestone - Target milestone to reach
 * @param previousMilestone - Previous milestone achieved (for relative progress)
 * @returns Progress percentage (0-100)
 */
export function calculateProgressPercentage(
  currentValue: number,
  targetMilestone: number,
  previousMilestone: number = 0
): number {
  if (currentValue >= targetMilestone) {
    return 100;
  }

  const range = targetMilestone - previousMilestone;
  const progressInRange = currentValue - previousMilestone;

  if (range <= 0) {
    return 100;
  }

  return Math.min(100, Math.max(0, (progressInRange / range) * 100));
}

/**
 * Create a streak requirement object
 * @param days - Number of consecutive days
 * @returns Achievement requirement for streak
 */
export function createStreakRequirement(days: number): AchievementRequirement {
  return {
    type: "streak",
    target: days,
    metric: "consecutive_days",
    timeframe: "all_time",
  };
}

/**
 * Create a count requirement object
 * @param target - Target count
 * @param metric - Metric to count (e.g., "recipes_cooked", "achievements_shared")
 * @returns Achievement requirement for count
 */
export function createCountRequirement(
  target: number,
  metric: string
): AchievementRequirement {
  return {
    type: "count",
    target,
    metric,
    timeframe: "all_time",
  };
}

/**
 * Create a cumulative requirement object
 * @param target - Target cumulative value
 * @param metric - Metric to accumulate (e.g., "ingredients_tracked", "ingredients_used_before_expiry")
 * @returns Achievement requirement for cumulative tracking
 */
export function createCumulativeRequirement(
  target: number,
  metric: string
): AchievementRequirement {
  return {
    type: "cumulative",
    target,
    metric,
    timeframe: "all_time",
  };
}

/**
 * Check if a streak threshold is reached
 * @param currentStreak - Current streak value
 * @param threshold - Target threshold
 * @returns True if threshold is reached or exceeded
 */
export function isStreakThresholdReached(
  currentStreak: number,
  threshold: number
): boolean {
  return currentStreak >= threshold;
}

/**
 * Get all streak thresholds that have been reached
 * @param currentStreak - Current streak value
 * @returns Array of reached threshold values
 */
export function getReachedStreakThresholds(currentStreak: number): number[] {
  return STREAK_MILESTONES.filter((threshold) => currentStreak >= threshold);
}

/**
 * Check if a recipe count threshold is reached
 * @param recipeCount - Current recipe count
 * @param threshold - Target threshold
 * @returns True if threshold is reached or exceeded
 */
export function isRecipeThresholdReached(
  recipeCount: number,
  threshold: number
): boolean {
  return recipeCount >= threshold;
}

/**
 * Get all recipe milestones that have been reached
 * @param recipeCount - Current recipe count
 * @returns Array of reached milestone values
 */
export function getReachedRecipeMilestones(recipeCount: number): number[] {
  return RECIPE_COUNT_THRESHOLDS.filter((threshold) => recipeCount >= threshold);
}

/**
 * Check if an ingredient tracking threshold is reached
 * @param ingredientCount - Current ingredient count
 * @param threshold - Target threshold
 * @returns True if threshold is reached or exceeded
 */
export function isIngredientThresholdReached(
  ingredientCount: number,
  threshold: number
): boolean {
  return ingredientCount >= threshold;
}

/**
 * Get all ingredient tracking milestones that have been reached
 * @param ingredientCount - Current ingredient count
 * @returns Array of reached milestone values
 */
export function getReachedIngredientMilestones(ingredientCount: number): number[] {
  return INGREDIENT_COUNT_THRESHOLDS.filter((threshold) => ingredientCount >= threshold);
}

/**
 * Check if a waste reduction threshold is reached
 * @param wasteReductionCount - Current waste reduction count
 * @param threshold - Target threshold
 * @returns True if threshold is reached or exceeded
 */
export function isWasteReductionThresholdReached(
  wasteReductionCount: number,
  threshold: number
): boolean {
  return wasteReductionCount >= threshold;
}

/**
 * Get all waste reduction milestones that have been reached
 * @param wasteReductionCount - Current waste reduction count
 * @returns Array of reached milestone values
 */
export function getReachedWasteReductionMilestones(
  wasteReductionCount: number
): number[] {
  return WASTE_REDUCTION_THRESHOLDS.filter((threshold) => wasteReductionCount >= threshold);
}

/**
 * Check if a social sharing threshold is reached
 * @param shareCount - Current share count
 * @param threshold - Target threshold
 * @returns True if threshold is reached or exceeded
 */
export function isSocialSharingThresholdReached(
  shareCount: number,
  threshold: number
): boolean {
  return shareCount >= threshold;
}

/**
 * Get all social sharing milestones that have been reached
 * @param shareCount - Current share count
 * @returns Array of reached milestone values
 */
export function getReachedSocialSharingMilestones(shareCount: number): number[] {
  return SOCIAL_SHARING_THRESHOLDS.filter((threshold) => shareCount >= threshold);
}

// ============================================
// ACHIEVEMENT DEFINITIONS EXPORT
// ============================================

/**
 * Complete achievement definitions registry
 * Maps achievement types/categories to their definitions
 */
export const ACHIEVEMENT_DEFINITIONS = {
  streak: STREAK_ACHIEVEMENT_DEFINITIONS,
  recipes: RECIPE_ACHIEVEMENT_DEFINITIONS,
  ingredients: INGREDIENT_ACHIEVEMENT_DEFINITIONS,
  waste: WASTE_REDUCTION_ACHIEVEMENT_DEFINITIONS,
  social: SOCIAL_SHARING_ACHIEVEMENT_DEFINITIONS,
  special: SPECIAL_ACHIEVEMENT_DEFINITIONS,
} as const;

/**
 * Achievement metric types used throughout the system
 */
export const ACHIEVEMENT_METRICS = {
  // Streak metrics
  CONSECUTIVE_DAYS: "consecutive_days",
  LONGEST_STREAK: "longest_streak",

  // Recipe metrics
  RECIPES_COOKED: "recipes_cooked",
  TOTAL_COOKS: "total_cooks",
  BREAKFAST_RECIPES_COOKED: "breakfast_recipes_cooked",
  DINNER_RECIPES_COOKED: "dinner_recipes_cooked",

  // Ingredient metrics
  INGREDIENTS_TRACKED: "ingredients_tracked",
  SPICES_TRACKED: "spices_tracked",

  // Waste reduction metrics
  INGREDIENTS_USED_BEFORE_EXPIRY: "ingredients_used_before_expiry",

  // Social metrics
  ACHIEVEMENTS_SHARED: "achievements_shared",
} as const;

/**
 * Achievement XP rewards for reference
 */
export const ACHIEVEMENT_XP_REWARDS = {
  STREAK: {
    BRONZE: 50,   // 3 days
    SILVER: 100,  // 7 days
    GOLD: 200,    // 14 days
    PLATINUM: 500, // 30 days
    DIAMOND: 2000, // 100 days
  },
  RECIPES: {
    FIRST: 25,    // 1 recipe
    BRONZE: 75,   // 5 recipes
    SILVER: 250,  // 25 recipes
    GOLD: 500,    // 50 recipes
    PLATINUM: 1000, // 100 recipes
  },
  INGREDIENTS: {
    BRONZE: 30,   // 10 ingredients
    SILVER: 100,  // 50 ingredients
    GOLD: 200,    // 100 ingredients
    PLATINUM: 500, // 250 ingredients
  },
  WASTE: {
    BRONZE: 50,   // 10 ingredients
    SILVER: 200,  // 50 ingredients
    GOLD: 500,    // 100 ingredients
  },
  SOCIAL: {
    BRONZE: 25,   // 1 share
    SILVER: 75,   // 5 shares
    GOLD: 150,    // 10 shares
  },
} as const;
