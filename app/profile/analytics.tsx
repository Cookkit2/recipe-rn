import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, ActivityIndicator, ScrollView } from "react-native";
import { LegendList } from "@legendapp/list";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWasteStats,
  useWasteOverTime,
  useWasteHistory,
} from "~/hooks/queries/useWasteAnalyticsQueries";
import { wasteAnalyticsQueryKeys } from "~/hooks/queries/wasteAnalyticsQueryKeys";
import {
  useWasteAnalyticsStore,
  WasteAnalyticsProvider,
  type TimePeriod,
} from "~/store/WasteAnalyticsContext";
import { H4, P } from "~/components/ui/typography";
import { LeafIcon, TrendingUpIcon } from "lucide-uniwind";
import WasteMetricsCard from "~/components/Analytics/WasteMetricsCard";
import WasteChart from "~/components/Analytics/WasteChart";
import { AchievementBadge, type Achievement } from "~/components/Analytics/AchievementBadge";
import WasteLogItem from "~/components/Analytics/WasteLogItem";
import LogWasteDialog from "~/components/Analytics/LogWasteDialog";
import AchievementConfetti from "~/components/Analytics/AchievementConfetti";
import { Card, CardContent } from "~/components/ui/card";

// CO2 conversion factor: 1kg of food waste ≈ 2.5kg CO2 equivalent
// Based on FAO (Food and Agriculture Organization) average for mixed food waste
const CO2_CONVERSION_FACTOR = 2.5;

// Helper function to get date range for time period
function getDateRangeForPeriod(period: TimePeriod): { start?: number; end?: number } {
  const now = Date.now();
  const end = now;

  switch (period) {
    case "week":
      // Start of current week (7 days ago)
      return { start: now - 7 * 24 * 60 * 60 * 1000, end };
    case "month":
      // Start of current month (30 days ago)
      return { start: now - 30 * 24 * 60 * 60 * 1000, end };
    case "year":
      // Start of current year (365 days ago)
      return { start: now - 365 * 24 * 60 * 60 * 1000, end };
    case "all":
    default:
      // All time - no start date
      return { start: undefined, end };
  }
}

// Helper function to calculate achievements from stats
function calculateAchievements(stats: any): Achievement[] {
  const totalWasteEntries = stats.totalWasteEntries || 0;
  const totalMoneyWasted = (stats.totalEstimatedCost || 0) / 100; // Convert cents to dollars
  const totalCO2FromWaste = (stats.totalQuantityWasted || 0) * CO2_CONVERSION_FACTOR; // Apply conversion
  const currentStreak = stats.currentStreak || 0;
  const longestStreak = stats.longestStreak || 0;

  const achievements: Achievement[] = [
    {
      id: "first-log",
      title: "Waste Warrior",
      description: "Log your first waste item",
      icon: "🗑️",
      unlocked: totalWasteEntries > 0,
    },
    {
      id: "zero-waste-week",
      title: "Zero Waste Week",
      description: "Go 7 days without logging any waste",
      icon: "🌿",
      unlocked: currentStreak >= 7,
      progress: currentStreak,
      target: 7,
    },
    {
      id: "money-saver",
      title: "Money Saver",
      description: "Track $100 worth of waste (awareness saves money)",
      icon: "💰",
      unlocked: totalMoneyWasted >= 100,
      progress: Math.floor(totalMoneyWasted),
      target: 100,
    },
    {
      id: "eco-hero",
      title: "Eco Hero",
      description: "Track 50kg of CO2 equivalent emissions",
      icon: "🌍",
      unlocked: totalCO2FromWaste >= 50,
      progress: Math.floor(totalCO2FromWaste),
      target: 50,
    },
    {
      id: "streak-master",
      title: "Streak Master",
      description: "Maintain a 30-day no-waste streak",
      icon: "🔥",
      unlocked: longestStreak >= 30,
      progress: longestStreak,
      target: 30,
    },
  ];
  return achievements;
}

function AnalyticsContent() {
  const { selectedTimePeriod, selectedMetric } = useWasteAnalyticsStore();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const previousUnlockedIds = useRef<Set<string>>(new Set());

  // Calculate date range based on selected time period
  const { start, end } = useMemo(
    () => getDateRangeForPeriod(selectedTimePeriod),
    [selectedTimePeriod]
  );

  // Fetch waste stats for the current period
  const {
    data: wasteStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useWasteStats(start, end);

  // Fetch waste over time for the chart
  const {
    data: wasteOverTime,
    isLoading: isLoadingChart,
    error: chartError,
  } = useWasteOverTime(
    start,
    end,
    selectedTimePeriod === "all" ? "month" : selectedTimePeriod === "year" ? "month" : "day"
  );

  // Fetch waste history
  const {
    data: wasteHistory,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useWasteHistory(50);

  // Calculate achievements from stats (always run hooks before any early returns)
  const achievements = useMemo(() => calculateAchievements(wasteStats || {}), [wasteStats]);

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  // Detect newly unlocked achievements and show confetti
  useEffect(() => {
    const currentUnlockedIds = new Set(unlockedAchievements.map((a) => a.id));
    const newlyUnlocked = Array.from(currentUnlockedIds).filter(
      (id) => !previousUnlockedIds.current.has(id)
    );

    if (newlyUnlocked.length > 0) {
      setShowConfetti(true);
      // Auto-hide confetti after animation completes (2000ms + buffer)
      const timeout = setTimeout(() => {
        setShowConfetti(false);
      }, 2500);
      return () => clearTimeout(timeout);
    }

    // Update previous unlocked state for next comparison
    previousUnlockedIds.current = currentUnlockedIds;
  }, [unlockedAchievements]);

  // Metrics data (using actual stats or defaults)
  const itemsWasted = wasteStats?.totalWasteEntries || 0;
  const moneyWasted = (wasteStats?.totalEstimatedCost || 0) / 100; // Convert cents to dollars
  const co2FromWaste = (wasteStats?.totalQuantityWasted || 0) * CO2_CONVERSION_FACTOR; // Apply CO2 conversion (1kg waste ≈ 2.5kg CO2)

  // Handle waste log success - refresh queries
  const handleWasteLogSuccess = () => {
    queryClient.invalidateQueries({
      queryKey: wasteAnalyticsQueryKeys.all,
    });
  };

  // Loading state
  if (isLoadingStats) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading analytics...</P>
      </View>
    );
  }

  // Error state
  if (statsError) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <P className="text-destructive text-center">{statsError.message}</P>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      showsVerticalScrollIndicator={false}
    >
      {/* Metrics Card */}
      <WasteMetricsCard
        itemsWasted={itemsWasted}
        moneyWasted={moneyWasted}
        co2FromWaste={co2FromWaste}
      />

      {/* Waste Trends Chart */}
      <WasteChart
        data={wasteOverTime || []}
        metric={selectedMetric}
        title="Waste Trends"
        description={selectedTimePeriod === "all" ? "All time" : `Last ${selectedTimePeriod}`}
        groupBy={
          selectedTimePeriod === "all" ? "month" : selectedTimePeriod === "year" ? "month" : "day"
        }
      />

      {/* Achievements Section */}
      <View className="mt-6 mx-6">
        <View className="flex-row items-center gap-2 mb-3">
          <LeafIcon size={20} className="text-primary" />
          <H4 className="font-urbanist-bold text-lg">Achievements</H4>
        </View>

        {unlockedAchievements.length === 0 && lockedAchievements.length === 0 ? (
          <Card className="rounded-2xl border-none">
            <CardContent className="p-6 items-center justify-center">
              <P className="text-muted-foreground text-center">
                Start tracking your waste to unlock achievements!
              </P>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <View className="gap-3 mb-3">
                {unlockedAchievements.map((achievement) => (
                  <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
              </View>
            )}

            {/* Locked Achievements */}
            {lockedAchievements.length > 0 && (
              <View className="gap-3">
                {lockedAchievements.map((achievement) => (
                  <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* Waste History Section */}
      <View className="mt-6 mb-6">
        <View className="flex-row items-center gap-2 mb-3 mx-6">
          <TrendingUpIcon size={20} className="text-secondary" />
          <H4 className="font-urbanist-bold text-lg flex-1">Recent Waste Log</H4>
          <LogWasteDialog onSuccess={handleWasteLogSuccess} />
        </View>

        {!wasteHistory || wasteHistory.length === 0 ? (
          <Card className="mx-6 rounded-2xl border-none">
            <CardContent className="p-6 items-center justify-center">
              <P className="text-muted-foreground text-center">
                No waste entries yet. Start tracking to see your impact!
              </P>
            </CardContent>
          </Card>
        ) : (
          <LegendList
            contentInsetAdjustmentBehavior="automatic"
            keyExtractor={(item) => item.id}
            className="bg-background"
            showsVerticalScrollIndicator={false}
            data={wasteHistory}
            renderItem={({ item }) => (
              <View className="px-6">
                <WasteLogItem key={item.id} wasteLog={item} />
              </View>
            )}
            ListEmptyComponent={
              <View className="py-8 items-center justify-center px-6">
                <P className="text-muted-foreground text-center">
                  No waste entries for this period
                </P>
              </View>
            }
          />
        )}
      </View>
    </ScrollView>
  );
}

// Wrapper component that provides the context
export default function Analytics() {
  return (
    <WasteAnalyticsProvider>
      <AnalyticsContent />
    </WasteAnalyticsProvider>
  );
}
