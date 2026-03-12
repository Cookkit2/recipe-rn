import type { AchievementCategory } from "~/types/achievements";

/**
 * Query key factory for achievement-related queries
 * This ensures consistent and type-safe query keys across the app
 */
export const achievementQueryKeys = {
  // Base key for all achievement queries
  all: ["achievements"] as const,

  // All achievement progress
  allProgress: () => [...achievementQueryKeys.all, "all"] as const,

  // Achievement progress by category
  byCategory: (category: AchievementCategory) =>
    [...achievementQueryKeys.all, "category", category] as const,

  // Single achievement progress
  progress: (achievementId: string) =>
    [...achievementQueryKeys.all, "progress", achievementId] as const,

  // Achievement check status (for newly unlocked)
  check: () => [...achievementQueryKeys.all, "check"] as const,
} as const;
