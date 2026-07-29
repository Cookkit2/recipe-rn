import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Link } from "expo-router";
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

const TabButton = ({
  value,
  label,
  icon,
  activeTab,
  setActiveTab,
}: {
  value: TabValue;
  label: string;
  icon: React.ReactNode;
  activeTab: TabValue;
  setActiveTab: (v: TabValue) => void;
}) => {
  const isActive = activeTab === value;
  return (
    <Pressable
      onPress={() => setActiveTab(value)}
      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl ${
        isActive ? "bg-primary" : "bg-muted/50"
      }`}
      accessibilityRole="tab"
      accessibilityLabel={`${label} tab`}
      accessibilityHint={`Switches to the ${label} view`}
      accessibilityState={{ selected: isActive }}
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

const EmptyState = ({
  title,
  description,
  icon,
  cta,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  cta?: React.ReactNode;
}) => (
  <View className="py-16 items-center justify-center px-6">
    <View className="mb-4">{icon}</View>
    <H4 className="text-muted-foreground font-urbanist-semibold text-center mb-2">{title}</H4>
    <P className="text-muted-foreground font-urbanist-regular text-center text-sm mb-6">
      {description}
    </P>
    {cta}
  </View>
);

const AchievementsList = ({
  groupedAchievements,
}: {
  groupedAchievements: Record<string, AchievementProgress[]>;
}) => {
  if (Object.keys(groupedAchievements).length === 0) {
    return (
      <EmptyState
        title="No Achievements Yet"
        description="Start cooking and tracking ingredients to unlock achievements!"
        icon={<TrophyIcon size={64} className="text-muted-foreground" />}
        cta={
          <Link href="/" asChild>
            <Button variant="default" className="bg-foreground">
              <P className="font-urbanist-semibold text-background">Discover Recipes</P>
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      {ACHIEVEMENT_CATEGORIES.map((category) => {
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
                <AchievementBadge key={achievement.achievement.id} achievement={achievement} />
              ))}
            </View>
          </View>
        );
      })}
    </>
  );
};

const ChallengesList = ({ challenges }: { challenges: ChallengeProgress[] }) => {
  if (challenges.length === 0) {
    return (
      <EmptyState
        title="No Active Challenges"
        description="Check back later for new daily and weekly challenges!"
        icon={<TargetIcon size={64} className="text-muted-foreground" />}
      />
    );
  }

  return (
    <>
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.challenge.id} challenge={challenge} />
      ))}
    </>
  );
};

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
      let categoryList = acc[category];
      if (!categoryList) {
        categoryList = [];
        acc[category] = categoryList;
      }
      categoryList.push(achievement);
      return acc;
    },
    {} as Record<string, AchievementProgress[]>
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
    >
      <View className="px-6 pt-6 pb-4 flex-row gap-2 bg-background">
        <TabButton
          value="achievements"
          label="Achievements"
          icon={
            <TrophyIcon
              size={16}
              className={
                activeTab === "achievements" ? "text-primary-foreground" : "text-foreground/70"
              }
            />
          }
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <TabButton
          value="challenges"
          label="Challenges"
          icon={
            <TargetIcon
              size={16}
              className={
                activeTab === "challenges" ? "text-primary-foreground" : "text-foreground/70"
              }
            />
          }
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </View>
      {activeTab === "achievements" ? (
        <View className="gap-6 pb-8">
          <AchievementsList groupedAchievements={groupedAchievements} />
        </View>
      ) : (
        <View className="gap-3 px-6 pb-8">
          <ChallengesList challenges={challenges} />
        </View>
      )}
    </ScrollView>
  );
}
