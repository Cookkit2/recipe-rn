import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { TrophyIcon, TargetIcon } from "lucide-uniwind";
import AchievementBadge from "~/components/Profile/AchievementBadge";
import ChallengeCard from "~/components/Profile/ChallengeCard";
import { AchievementService } from "~/data/services/AchievementService";
import { ChallengeService } from "~/data/services/ChallengeService";
import type { AchievementProgress, ChallengeProgress } from "~/types/achievements";
import { ACHIEVEMENT_CATEGORIES } from "~/types/achievements";

type TabValue = "achievements" | "challenges";

const achievementService = new AchievementService();
const challengeService = new ChallengeService();

export default function AchievementsScreen() {
  const [activeTab, setActiveTab] = useState<TabValue>("achievements");
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [challenges, setChallenges] = useState<ChallengeProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (activeTab === "achievements") {
        const allProgress = await achievementService.getAllProgress();
        setAchievements(allProgress);
      } else {
        const activeChallenges = await challengeService.getActiveChallenges();
        setChallenges(activeChallenges);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group achievements by category
  const groupedAchievements = achievements.reduce(
    (acc, achievement) => {
      const category = achievement.achievement.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(achievement);
      return acc;
    },
    {} as Record<string, AchievementProgress[]>
  );

  const renderTabButton = (value: TabValue, label: string, icon: React.ReactNode) => {
    const isActive = activeTab === value;
    return (
      <Pressable
        onPress={() => setActiveTab(value)}
        className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl ${
          isActive ? "bg-primary" : "bg-muted/50"
        }`}
      >
        {icon}
        <Small
          className={`font-urbanist-semibold ${
            isActive ? "text-primary-foreground" : "text-foreground/70"
          }`}
        >
          {label}
        </Small>
      </Pressable>
    );
  };

  const renderEmptyState = (title: string, description: string, icon: React.ReactNode) => (
    <View className="py-16 items-center justify-center px-6">
      <View className="mb-4">{icon}</View>
      <H4 className="text-muted-foreground font-urbanist-semibold text-center mb-2">{title}</H4>
      <P className="text-muted-foreground font-urbanist-regular text-center text-sm">
        {description}
      </P>
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <P className="text-destructive text-center">{error}</P>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      className="bg-background"
      stickyHeaderIndices={[0]}
      StickyHeaderComponent={() => (
        <View className="px-6 pt-6 pb-4 flex-row gap-2">
          {renderTabButton(
            "achievements",
            "Achievements",
            <TrophyIcon
              size={16}
              className={
                activeTab === "achievements" ? "text-primary-foreground" : "text-foreground/70"
              }
            />
          )}
          {renderTabButton(
            "challenges",
            "Challenges",
            <TargetIcon
              size={16}
              className={
                activeTab === "challenges" ? "text-primary-foreground" : "text-foreground/70"
              }
            />
          )}
        </View>
      )}
    >
      {activeTab === "achievements" ? (
        <View className="gap-6 pb-8">
          {Object.keys(groupedAchievements).length === 0
            ? renderEmptyState(
                "No Achievements Yet",
                "Start cooking and tracking ingredients to unlock achievements!",
                <TrophyIcon size={64} className="text-muted-foreground" />
              )
            : ACHIEVEMENT_CATEGORIES.map((category) => {
                const categoryAchievements = groupedAchievements[category];
                if (!categoryAchievements || categoryAchievements.length === 0) {
                  return null;
                }

                return (
                  <View key={category}>
                    <P className="text-foreground/60 font-urbanist-semibold px-6 mb-2 capitalize">
                      {category.replace("_", " ")}
                    </P>
                    <View className="gap-3 px-6">
                      {categoryAchievements.map((achievement) => (
                        <AchievementBadge
                          key={achievement.achievement.id}
                          achievement={achievement}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
        </View>
      ) : (
        <View className="gap-3 px-6 pb-8">
          {challenges.length === 0
            ? renderEmptyState(
                "No Active Challenges",
                "Check back later for new daily and weekly challenges!",
                <TargetIcon size={64} className="text-muted-foreground" />
              )
            : challenges.map((challenge) => (
                <ChallengeCard key={challenge.challenge.id} challenge={challenge} />
              ))}
        </View>
      )}
    </ScrollView>
  );
}
