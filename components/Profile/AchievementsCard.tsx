import React from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { FlameIcon, TrophyIcon } from "lucide-uniwind";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P, Small } from "~/components/ui/typography";
import { AchievementService } from "~/data/services/AchievementService";
import { StreakService } from "~/data/services/StreakService";
import type { AchievementProgress } from "~/types/achievements";

const achievementService = new AchievementService();
const streakService = new StreakService();

export default function AchievementsCard() {
  const router = useRouter();

  const { data: achievements, isLoading: isLoadingAchievements } = useQuery({
    queryKey: ["achievements", "progress"],
    queryFn: async () => {
      const allProgress = await achievementService.getAllProgress();
      return allProgress;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: currentStreak, isLoading: isLoadingStreak } = useQuery({
    queryKey: ["streak", "current"],
    queryFn: async () => {
      return await streakService.calculateCurrentStreak();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get top 3 achievements (prioritize unlocked, then in-progress)
  const topAchievements = React.useMemo(() => {
    if (!achievements || achievements.length === 0) {
      return [];
    }

    const sorted = [...achievements].sort((a, b) => {
      // Unlocked achievements first
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;

      // Then by progress percentage (highest first)
      if (a.progressPercentage !== b.progressPercentage) {
        return b.progressPercentage - a.progressPercentage;
      }

      // Finally by sort order
      return a.achievement.sortOrder - b.achievement.sortOrder;
    });

    return sorted.slice(0, 3);
  }, [achievements]);

  const totalUnlocked = achievements?.filter((a) => a.isUnlocked).length ?? 0;
  const totalAchievements = achievements?.length ?? 0;

  const isLoading = isLoadingAchievements || isLoadingStreak;

  const handlePress = () => {
    router.push("/profile/achievements");
  };

  return (
    <Pressable onPress={handlePress}>
      <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
        <CardContent className="py-6 gap-4">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <TrophyIcon className="text-primary" size={20} strokeWidth={2.5} />
              <H4 className="font-urbanist-bold">Achievements</H4>
            </View>
            <Small className="text-muted-foreground font-urbanist-medium">
              {totalUnlocked}/{totalAchievements}
            </Small>
          </View>

          {/* Streak Display */}
          {!isLoading && currentStreak !== undefined && currentStreak > 0 && (
            <View className="flex-row items-center gap-2 bg-primary/10 rounded-2xl px-4 py-3">
              <FlameIcon className="text-primary" size={20} strokeWidth={2.5} />
              <View className="flex-1">
                <Small className="text-foreground/70 font-urbanist-medium">Current Streak</Small>
                <H4 className="font-urbanist-bold text-lg">
                  {currentStreak} {currentStreak === 1 ? "day" : "days"}
                </H4>
              </View>
            </View>
          )}

          {/* Top Achievements Preview */}
          {!isLoading && topAchievements.length > 0 ? (
            <View className="gap-2">
              {topAchievements.map((achievement) => (
                <View
                  key={achievement.achievement.id}
                  className="flex-row items-center gap-3 bg-muted/30 rounded-xl px-3 py-2"
                >
                  <P className="text-xl">{achievement.achievement.icon}</P>
                  <View className="flex-1">
                    <Small className="font-urbanist-semibold text-foreground" numberOfLines={1}>
                      {achievement.achievement.title}
                    </Small>
                    <Small className="text-muted-foreground font-urbanist-medium" numberOfLines={1}>
                      {achievement.isUnlocked
                        ? "Unlocked!"
                        : `${achievement.progress}/${achievement.achievement.requirement.target}`}
                    </Small>
                  </View>
                </View>
              ))}
            </View>
          ) : !isLoading ? (
            <View className="items-center py-2">
              <Small className="text-muted-foreground font-urbanist-medium text-center">
                Start cooking to unlock achievements!
              </Small>
            </View>
          ) : (
            <View className="py-2">
              <Small className="text-muted-foreground font-urbanist-medium">Loading...</Small>
            </View>
          )}

          {/* Tap to View More Indicator */}
          <View className="items-center pt-1">
            <Small className="text-primary font-urbanist-semibold">
              Tap to view all achievements
            </Small>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}
