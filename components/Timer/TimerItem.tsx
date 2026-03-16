/**
 * Timer Item Component
 *
 * Displays a single cooking timer with countdown, status indicator,
 * and controls for play/pause and delete.
 */

import React, { useEffect } from "react";
import { View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useSharedValue,
} from "react-native-reanimated";
import { cn } from "~/lib/utils";
import { PlayIcon, PauseIcon, Trash2Icon, ClockIcon } from "lucide-uniwind";
import * as Haptics from "expo-haptics";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import { formatTimerDuration } from "~/utils/timer-service";
import type { Timer, TimerStatus } from "~/types/Timer";
import { Text } from "~/components/ui/text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TimerItemProps {
  timer: Timer;
  onTogglePlay: (timerId: string) => void;
  onDelete: (timerId: string) => void;
  className?: string;
}

/**
 * Get the appropriate icon and color for timer status
 */
function getStatusConfig(status: TimerStatus) {
  switch (status) {
    case "running":
      return {
        color: "text-primary",
        bgColor: "bg-primary/10",
        icon: <ClockIcon size={14} className="text-primary" />,
      };
    case "paused":
      return {
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        icon: <PauseIcon size={14} className="text-orange-500" />,
      };
    case "completed":
      return {
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        icon: <ClockIcon size={14} className="text-green-500" />,
      };
    default:
      return {
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        icon: <ClockIcon size={14} className="text-muted-foreground" />,
      };
  }
}

export function TimerItem({ timer, onTogglePlay, onDelete, className }: TimerItemProps) {
  const {
    animatedStyle: pressStyle,
    handlePressIn,
    handlePressOut,
  } = useOnPressScale();
  const pulseScale = useSharedValue(1);

  const statusConfig = getStatusConfig(timer.status);
  const isRunning = timer.status === "running";
  const isPaused = timer.status === "paused";
  const isCompleted = timer.status === "completed";

  // Pulse animation when timer is running
  useEffect(() => {
    if (isRunning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isRunning, pulseScale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleTogglePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTogglePlay(timer.id);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(timer.id);
  };

  return (
    <Animated.View style={[pressStyle, pulseAnimatedStyle]}>
      <View
        className={cn(
          "flex-row items-center justify-between p-4 rounded-xl",
          "bg-card border border-border",
          statusConfig.bgColor,
          className
        )}
      >
        {/* Timer Info */}
        <View className="flex-1 gap-1">
          {/* Timer Name with Status Icon */}
          <View className="flex-row items-center gap-2">
            {statusConfig.icon}
            <Text className="font-urbanist-semibold text-foreground text-base">
              {timer.name}
            </Text>
          </View>

          {/* Countdown Display */}
          <Text
            className={cn(
              "font-urbanist-medium text-2xl tabular-nums tracking-tight",
              isCompleted ? "text-green-500" : "text-foreground"
            )}
          >
            {isCompleted ? "Done!" : formatTimerDuration(timer.remainingSeconds)}
          </Text>
        </View>

        {/* Controls */}
        <View className="flex-row items-center gap-2">
          {/* Play/Pause Button */}
          {!isCompleted && (
            <AnimatedPressable
              onPress={handleTogglePlay}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              accessibilityLabel={isRunning ? "Pause timer" : "Start timer"}
              accessibilityRole="button"
              className={cn(
                "w-12 h-12 rounded-full items-center justify-center",
                isRunning
                  ? "bg-muted"
                  : "bg-primary"
              )}
            >
              {isRunning ? (
                <PauseIcon size={24} className="text-foreground" />
              ) : (
                <PlayIcon size={24} className="text-primary-foreground" />
              )}
            </AnimatedPressable>
          )}

          {/* Delete Button */}
          <AnimatedPressable
            onPress={handleDelete}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            className="w-10 h-10 rounded-full items-center justify-center bg-muted"
          >
            <Trash2Icon size={20} className="text-muted-foreground" />
          </AnimatedPressable>
        </View>
      </View>
    </Animated.View>
  );
}
