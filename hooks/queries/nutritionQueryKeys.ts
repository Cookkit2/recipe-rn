/**
 * Query key factory for nutrition related queries
 * Centralized key management for React Query cache invalidation and organization
 */
export const nutritionQueryKeys = {
  // Base key for all nutrition queries
  all: ["nutrition"] as const,

  // Daily nutrition summary for a specific date
  day: (date: string) => [...nutritionQueryKeys.all, "day", date] as const,

  // Weekly nutrition summary starting from a specific date
  week: (weekStart: string) => [...nutritionQueryKeys.all, "week", weekStart] as const,
} as const;
