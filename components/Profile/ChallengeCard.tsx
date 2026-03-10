import React from "react";
import { Pressable, View } from "react-native";
import { CardContent } from "../ui/card";
import { H4, P, Small } from "../ui/typography";
import { Progress } from "../ui/progress";
import type { ChallengeProgress as ChallengeProgressType } from "~/types/achievements";
import { LockIcon, CheckCircle2Icon, ClockIcon, TrophyIcon } from "lucide-uniwind";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { cn } from "~/lib/utils";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ChallengeCardProps {
  challenge: ChallengeProgressType;
  onPress?: () => void;
}

export default function ChallengeCard({ challenge, onPress }: ChallengeCardProps) {
  const {
    challenge: ch,
    progress,
    progressPercentage,
    isActive,
    isCompleted,
    isExpired,
    isAvailable,
    timeRemaining,
  } = challenge;

  const getCardStyle = () => {
    if (isCompleted) return "bg-primary/5 border-primary/30";
    if (isActive) return "bg-card";
    if (isExpired) return "bg-muted/30";
    return "bg-card";
  };

  const getStatusColor = () => {
    if (isCompleted) return "text-primary";
    if (isActive) return "text-foreground";
    if (isExpired) return "text-muted-foreground";
    return "text-foreground";
  };

  const getStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle2Icon className="text-primary" size={20} strokeWidth={2.5} />;
    }
    if (isAvailable) {
      return <LockIcon className="text-muted-foreground" size={16} strokeWidth={2} />;
    }
    if (timeRemaining && timeRemaining > 0) {
      return <ClockIcon className="text-foreground/60" size={16} strokeWidth={2} />;
    }
    return null;
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const content = (
    <CardContent className="py-4 gap-3">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1">
          {/* Challenge Type Badge */}
          <View
            className={cn(
              "rounded-full px-2 py-1",
              ch.type === "daily" ? "bg-orange-500/10" : "bg-blue-500/10"
            )}
          >
            <Small
              className={cn(
                "font-urbanist-semibold uppercase",
                ch.type === "daily" ? "text-orange-500" : "text-blue-500"
              )}
            >
              {ch.type}
            </Small>
          </View>

          {/* Status Icon */}
          {getStatusIcon()}
        </View>

        {/* Time Remaining */}
        {timeRemaining !== undefined && timeRemaining > 0 && !isCompleted && (
          <View className="flex-row items-center gap-1">
            <ClockIcon className="text-foreground/60" size={14} strokeWidth={2} />
            <Small className="text-foreground/60 font-urbanist-medium">
              {formatTimeRemaining(timeRemaining)}
            </Small>
          </View>
        )}
      </View>

      {/* Title and Description */}
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <H4 className="font-urbanist-semibold flex-1" numberOfLines={1}>
            {ch.title}
          </H4>
        </View>
        <Small className="text-foreground/70 font-urbanist-medium" numberOfLines={2}>
          {ch.description}
        </Small>
      </View>

      {/* Progress Section */}
      {(isActive || isAvailable) && (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Small className="text-muted-foreground font-urbanist-medium">
              {ch.requirement.description}
            </Small>
            <Small className="text-muted-foreground font-urbanist-medium">
              {progress}/{ch.requirement.target}
            </Small>
          </View>
          <Progress value={progressPercentage} className="h-2" />
          <View className="flex-row items-center justify-end">
            <Small className="text-muted-foreground font-urbanist-semibold">
              {Math.round(progressPercentage)}%
            </Small>
          </View>
        </View>
      )}

      {/* Completed Progress */}
      {isCompleted && (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Small className="text-primary font-urbanist-medium">Challenge Complete!</Small>
            <Small className="text-primary font-urbanist-semibold">
              {progress}/{ch.requirement.target}
            </Small>
          </View>
          <Progress value={100} className="h-2" indicatorClassName="bg-primary" />
        </View>
      )}

      {/* Expired Progress */}
      {isExpired && (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Small className="text-muted-foreground font-urbanist-medium">Expired</Small>
            <Small className="text-muted-foreground font-urbanist-medium">
              {progress}/{ch.requirement.target}
            </Small>
          </View>
          <Progress
            value={progressPercentage}
            className="h-2"
            indicatorClassName="bg-muted-foreground/40"
          />
        </View>
      )}

      {/* Reward Section */}
      <View className="flex-row items-center gap-2 mt-1">
        <View className="rounded-full bg-amber-500/20 px-2 py-1 flex-row items-center gap-1">
          <TrophyIcon className="text-amber-500" size={12} strokeWidth={2.5} />
          <Small className="text-amber-500 font-urbanist-semibold">+{ch.reward.xp} XP</Small>
        </View>

        {ch.reward.bonus && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="rounded-full bg-purple-500/20 px-2 py-1"
          >
            <Small className="text-purple-500 font-urbanist-semibold">
              {ch.reward.bonus.type === "streak_freeze" && "Streak Freeze"}
              {ch.reward.bonus.type === "xp_multiplier" && `${ch.reward.bonus.value}x XP Boost`}
              {ch.reward.bonus.type === "unlock_badge" && "Exclusive Badge"}
            </Small>
          </Animated.View>
        )}
      </View>
    </CardContent>
  );

  if (onPress && (isActive || isAvailable)) {
    return (
      <AnimatedPressable
        className={cn("rounded-3xl shadow-md shadow-foreground/10 border-none", getCardStyle())}
        onPress={onPress}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View className={cn("rounded-3xl shadow-md shadow-foreground/10 border-none", getCardStyle())}>
      {content}
    </View>
  );
}
