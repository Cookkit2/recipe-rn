import React from "react";
import { Pressable, View } from "react-native";
import { CardContent } from "../ui/card";
import { H4, P, Small } from "../ui/typography";
import { Progress } from "../ui/progress";
import type { AchievementProgress as AchievementProgressType } from "~/types/achievements";
import { LockIcon, CheckCircle2Icon, Share2Icon } from "lucide-uniwind";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AchievementBadgeProps {
  achievement: AchievementProgressType;
  onPress?: () => void;
  onShare?: () => void;
  size?: "small" | "medium" | "large";
  showShareButton?: boolean;
}

export default function AchievementBadge({
  achievement,
  onPress,
  onShare,
  size = "medium",
  showShareButton = true,
}: AchievementBadgeProps) {
  const { achievement: ach, progress, progressPercentage, isUnlocked, isLocked, isInProgress } =
    achievement;

  const iconSize = size === "small" ? 32 : size === "medium" ? 40 : 48;
  const padding = size === "small" ? "py-3" : size === "medium" ? "py-4" : "py-5";

  const getStatusColor = () => {
    if (isUnlocked) return "bg-primary/10";
    if (isInProgress) return "bg-card";
    return "bg-muted/30";
  };

  const getIconOpacity = () => {
    if (isUnlocked) return 1;
    if (isInProgress) return 0.7;
    return 0.3;
  };

  const getStatusIcon = () => {
    if (isUnlocked) {
      return <CheckCircle2Icon className="text-primary" size={20} strokeWidth={2.5} />;
    }
    if (isLocked) {
      return <LockIcon className="text-muted-foreground" size={16} strokeWidth={2} />;
    }
    return null;
  };

  const content = (
    <CardContent className={`${padding} gap-3`}>
      <View className="flex-row items-center gap-3">
        {/* Icon */}
        <View
          className="rounded-full items-center justify-center"
          style={{
            width: iconSize + 16,
            height: iconSize + 16,
            opacity: getIconOpacity(),
            backgroundColor: isUnlocked ? "rgba(255, 107, 53, 0.1)" : "transparent",
          }}
        >
          <P style={{ fontSize: iconSize }}>{ach.icon}</P>
        </View>

        {/* Text Content */}
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <H4 className="font-urbanist-semibold flex-1" numberOfLines={1}>
              {ach.title}
            </H4>
            <View className="flex-row items-center gap-2">
              {getStatusIcon()}
              {showShareButton && onShare && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onShare();
                  }}
                  className="p-1 -mr-1"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Share2Icon
                    className={isUnlocked ? "text-primary" : "text-muted-foreground"}
                    size={16}
                    strokeWidth={2}
                  />
                </Pressable>
              )}
            </View>
          </View>
          <Small
            className="text-foreground/70 font-urbanist-medium"
            numberOfLines={2}
          >
            {ach.description}
          </Small>
        </View>
      </View>

      {/* Progress Section */}
      {(isInProgress || (!isUnlocked && !isLocked)) && (
        <View className="gap-2 mt-1">
          <View className="flex-row items-center justify-between">
            <Small className="text-muted-foreground font-urbanist-medium">
              {ach.reward?.description || `${progress}/${ach.requirement.target}`}
            </Small>
            <Small className="text-muted-foreground font-urbanist-medium">
              {Math.round(progressPercentage)}%
            </Small>
          </View>
          <Progress value={progressPercentage} className="h-2" />
        </View>
      )}

      {/* XP Badge */}
      {ach.xp && isUnlocked && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          className="rounded-full bg-primary/20 self-start px-2 py-1"
        >
          <Small className="text-primary font-urbanist-semibold">+{ach.xp} XP</Small>
        </Animated.View>
      )}
    </CardContent>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        className={`rounded-3xl shadow-md shadow-foreground/10 border-none ${getStatusColor()}`}
        onPress={onPress}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View className={`rounded-3xl shadow-md shadow-foreground/10 border-none ${getStatusColor()}`}>
      {content}
    </View>
  );
}
