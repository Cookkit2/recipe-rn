import type { ChallengeType } from "~/types/achievements";

/**
 * Query key factory for challenge-related queries
 * This ensures consistent and type-safe query keys across the app
 */
export const challengeQueryKeys = {
  // Base key for all challenge queries
  all: ["challenges"] as const,

  // All active challenges
  active: () => [...challengeQueryKeys.all, "active"] as const,

  // Active daily challenges
  daily: () => [...challengeQueryKeys.all, "daily"] as const,

  // Active weekly challenges
  weekly: () => [...challengeQueryKeys.all, "weekly"] as const,

  // User's active (in progress) challenges
  userActive: () => [...challengeQueryKeys.all, "user", "active"] as const,

  // User's completed challenges
  completed: () => [...challengeQueryKeys.all, "user", "completed"] as const,

  // Unclaimed completed challenges
  unclaimed: () => [...challengeQueryKeys.all, "unclaimed"] as const,

  // Single challenge progress
  progress: (challengeId: string) =>
    [...challengeQueryKeys.all, "progress", challengeId] as const,

  // Challenges expiring soon (within 24 hours)
  expiringSoon: () => [...challengeQueryKeys.all, "expiring-soon"] as const,

  // Total XP earned
  totalXP: () => [...challengeQueryKeys.all, "total-xp"] as const,

  // Available XP from active challenges
  availableXP: () => [...challengeQueryKeys.all, "available-xp"] as const,
} as const;
