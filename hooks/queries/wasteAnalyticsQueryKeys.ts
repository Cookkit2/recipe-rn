/**
 * Query key factory for waste analytics related queries
 * This ensures consistent and type-safe query keys across the app
 */
export const wasteAnalyticsQueryKeys = {
  // Base key for all waste analytics queries
  all: ["wasteAnalytics"] as const,

  // Waste analytics dashboard/summary
  dashboard: () => [...wasteAnalyticsQueryKeys.all, "dashboard"] as const,

  // All discarded items
  discardedItems: () => [...wasteAnalyticsQueryKeys.all, "discarded"] as const,

  // Discarded items filtered by date range
  discardedItemsByDateRange: (startDate: string, endDate: string) =>
    [
      ...wasteAnalyticsQueryKeys.discardedItems(),
      "range",
      { startDate, endDate },
    ] as const,

  // Money saved metrics
  moneySaved: () => [...wasteAnalyticsQueryKeys.all, "moneySaved"] as const,

  // Money saved by time period
  moneySavedByPeriod: (period: "week" | "month" | "year") =>
    [...wasteAnalyticsQueryKeys.moneySaved(), "period", period] as const,

  // Waste trends/charts over time
  trends: (period: "day" | "week" | "month" | "year") =>
    [...wasteAnalyticsQueryKeys.all, "trends", period] as const,

  // Environmental impact metrics
  environmentalImpact: () =>
    [...wasteAnalyticsQueryKeys.all, "environmentalImpact"] as const,

  // CO2 emissions saved
  co2Saved: () => [...wasteAnalyticsQueryKeys.environmentalImpact(), "co2"] as const,

  // Water saved
  waterSaved: () => [...wasteAnalyticsQueryKeys.environmentalImpact(), "water"] as const,

  // Achievements and milestones
  achievements: () => [...wasteAnalyticsQueryKeys.all, "achievements"] as const,

  // Unlocked achievements
  unlockedAchievements: () =>
    [...wasteAnalyticsQueryKeys.achievements(), "unlocked"] as const,

  // Available achievements (not yet unlocked)
  availableAchievements: () =>
    [...wasteAnalyticsQueryKeys.achievements(), "available"] as const,

  // Streak tracking
  streaks: () => [...wasteAnalyticsQueryKeys.all, "streaks"] as const,

  // Current no-waste streak
  currentStreak: () => [...wasteAnalyticsQueryKeys.streaks(), "current"] as const,

  // Longest no-waste streak
  longestStreak: () => [...wasteAnalyticsQueryKeys.streaks(), "longest"] as const,

  // Comparison to average household waste
  comparison: () => [...wasteAnalyticsQueryKeys.all, "comparison"] as const,
} as const;
