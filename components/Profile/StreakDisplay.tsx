import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "../ui/card";
import { H4, P, Small } from "../ui/typography";
import { useQuery } from "@tanstack/react-query";
import { streakService } from "~/data/services/StreakService";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

const AnimatedView = Animated.View;

export default function StreakDisplay() {
  const { data: streakInfo, isLoading } = useQuery({
    queryKey: ["streak", "info"],
    queryFn: async () => {
      const info = await streakService.getStreakInfo();
      return info;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const scaleValue = useSharedValue(1);

  // Animate when streak changes
  useEffect(() => {
    if (streakInfo?.currentStreak && streakInfo.currentStreak > 0) {
      scaleValue.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withSpring(1, { damping: 15, stiffness: 150 })
      );
    }
  }, [streakInfo?.currentStreak, scaleValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  if (isLoading) {
    return (
      <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none">
        <CardContent className="py-6 px-6">
          <View className="flex-row items-center gap-3">
            <P className="text-4xl">🔥</P>
            <View className="flex-1">
              <P className="text-sm text-foreground/50 font-urbanist-medium">Loading streak...</P>
            </View>
          </View>
        </CardContent>
      </Card>
    );
  }

  const currentStreak = streakInfo?.currentStreak ?? 0;
  const longestStreak = streakInfo?.longestStreak ?? 0;

  const getStreakMessage = () => {
    if (currentStreak === 0) {
      return "Start cooking to build your streak!";
    }
    if (currentStreak === 1) {
      return "Great start! Keep it going!";
    }
    if (currentStreak < 7) {
      return "You're on fire! Keep cooking!";
    }
    if (currentStreak < 30) {
      return "Incredible streak! Almost a week!";
    }
    return "Legendary chef! Amazing dedication!";
  };

  return (
    <Card className="flex-1 mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
      <CardContent className="py-6 px-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 gap-1">
            {/* Title */}
            <View className="flex-row items-center gap-2">
              <P className="text-3xl">🔥</P>
              <H4 className="font-urbanist-bold text-foreground">
                {currentStreak} Day{currentStreak !== 1 ? "s" : ""} in a Row
              </H4>
            </View>

            {/* Message */}
            <Small className="text-foreground/70 font-urbanist-medium" numberOfLines={1}>
              {getStreakMessage()}
            </Small>

            {/* Longest streak indicator */}
            {longestStreak > 0 && longestStreak !== currentStreak && (
              <Small className="text-xs text-muted-foreground font-urbanist-medium mt-1">
                Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </Small>
            )}
          </View>

          {/* Animated streak count badge */}
          {currentStreak > 0 && (
            <AnimatedView
              entering={FadeInDown.springify().damping(15)}
              style={animatedStyle}
              className="rounded-full bg-orange-500 dark:bg-orange-600 px-4 py-2 shadow-md shadow-orange-500/30"
            >
              <P className="text-white font-urbanist-bold text-lg text-center">
                {currentStreak}
              </P>
            </AnimatedView>
          )}
        </View>

        {/* Streak status indicator */}
        {currentStreak > 0 && (
          <AnimatedView
            entering={FadeIn.delay(200).duration(300)}
            className="mt-3 flex-row items-center gap-2"
          >
            <View className="h-2 flex-1 bg-muted/30 rounded-full overflow-hidden">
              <Animated.View
                className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                style={{
                  width: `${Math.min((currentStreak / 30) * 100, 100)}%`,
                }}
              />
            </View>
            <Small className="text-xs text-muted-foreground font-urbanist-medium w-12 text-right">
              {Math.min(currentStreak, 30)}/30
            </Small>
          </AnimatedView>
        )}
      </CardContent>
    </Card>
  );
}
