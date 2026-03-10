import React from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import { H4, P } from "~/components/ui/typography";
import { Text } from "~/components/ui/text";
import type { RecipeImportStatus } from "~/data/api/recipeImportApi";

interface ImportProgressBarProps {
  progress: number; // 0-100
  status: RecipeImportStatus;
  message: string;
}

export default function ImportProgressBar({ progress, status, message }: ImportProgressBarProps) {
  const progressBarStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${progress}%`, {
        damping: 15,
        stiffness: 100,
      }),
    };
  });

  const pulseStyle = useAnimatedStyle(() => {
    if (status === "complete" || status === "error") {
      return { opacity: 1 };
    }
    return {
      opacity: withSequence(
        withDelay(0, withSpring(1)),
        withDelay(500, withSpring(0.5)),
        withDelay(500, withSpring(1))
      ),
    };
  }, [status]);

  const getStatusColor = () => {
    if (status === "complete") return "bg-green-500";
    if (status === "error") return "bg-destructive";
    return "bg-primary";
  };

  const getStatusIcon = () => {
    if (status === "complete") return "✅";
    if (status === "error") return "❌";
    if (status === "analyzing" || status === "generating-recipe") return "🤖";
    if (status === "fetching-transcript") return "📝";
    if (status === "fetching-metadata") return "🎬";
    if (status === "comparing-pantry") return "🛒";
    return "⏳";
  };

  return (
    <View className="p-4 bg-card rounded-xl border border-border">
      {/* Status Header */}
      <View className="flex-row items-center mb-3">
        <Animated.Text style={[{ fontSize: 24, marginRight: 8 }, pulseStyle]}>
          {getStatusIcon()}
        </Animated.Text>
        <H4 className="text-foreground flex-1">Importing Recipe</H4>
        <Text className="text-muted-foreground font-mono text-sm">{progress}%</Text>
      </View>

      {/* Progress Bar */}
      <View className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <Animated.View className={`h-full ${getStatusColor()}`} style={progressBarStyle} />
      </View>

      {/* Status Message */}
      <P className="text-muted-foreground text-sm">{message}</P>

      {/* Step Indicators */}
      <View className="mt-4 space-y-2">
        <StepIndicator
          label="Validate URL"
          isActive={status === "validating-url"}
          isComplete={progress > 10}
        />
        <StepIndicator
          label="Fetch Video Info"
          isActive={status === "fetching-metadata"}
          isComplete={progress > 25}
        />
        <StepIndicator
          label="Extract Transcript"
          isActive={status === "fetching-transcript"}
          isComplete={progress > 40}
        />
        <StepIndicator
          label="AI Analysis"
          isActive={status === "analyzing" || status === "generating-recipe"}
          isComplete={progress > 80}
        />
        <StepIndicator
          label="Compare Pantry"
          isActive={status === "comparing-pantry"}
          isComplete={progress >= 100}
        />
      </View>
    </View>
  );
}

interface StepIndicatorProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function StepIndicator({ label, isActive, isComplete }: StepIndicatorProps) {
  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(isActive ? 1.1 : 1, {
            damping: 10,
          }),
        },
      ],
    };
  }, [isActive]);

  const getIndicatorColor = () => {
    if (isComplete) return "bg-green-500";
    if (isActive) return "bg-primary";
    return "bg-muted";
  };

  const getIndicatorIcon = () => {
    if (isComplete) return "✓";
    if (isActive) return "◉";
    return "○";
  };

  return (
    <View className="flex-row items-center">
      <Animated.View
        className={`w-6 h-6 rounded-full ${getIndicatorColor()} items-center justify-center mr-3`}
        style={indicatorStyle}
      >
        <Text
          className={`${isComplete ? "text-white" : isActive ? "text-primary-foreground" : "text-muted-foreground"} text-xs font-bold`}
        >
          {getIndicatorIcon()}
        </Text>
      </Animated.View>
      <Text
        className={`${isActive ? "text-foreground font-semibold" : isComplete ? "text-muted-foreground line-through" : "text-muted-foreground"}`}
      >
        {label}
      </Text>
    </View>
  );
}
