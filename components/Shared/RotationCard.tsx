import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  withDelay,
  withSpring,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import type { ViewStyle } from "react-native";
import { cn } from "~/lib/tw-merge";
import {
  SEED_INDEX_MULTIPLIER,
  SEED_TOTAL_MULTIPLIER,
} from "~/constants/seeds";
import {
  SPRING_CONFIG,
  SPRING_CONFIG_SPRINGY,
} from "~/constants/spring-config";

const RotationCard = ({
  index,
  total,
  className,
  style,
  children,
  scaleEnabled = true,
  rotationEnabled = true,
  counterRotationValue,
}: {
  index: number;
  total: number;
  className?: string;
  style?: ViewStyle;
  children: React.ReactNode;
  scaleEnabled?: boolean;
  rotationEnabled?: boolean;
  counterRotationValue?: SharedValue<number>;
}) => {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(90);

  useEffect(() => {
    // Animate to final values with delay based on index
    scale.value = withDelay(
      index * 100 + 100,
      withSpring(
        scaleEnabled ? stableThumbScale(index, total) : 1,
        SPRING_CONFIG_SPRINGY
      )
    );

    rotation.value = withDelay(
      index * 100 + 100,
      withSpring(
        rotationEnabled ? stableThumbRotation(index, total) : 0,
        SPRING_CONFIG_SPRINGY
      )
    );
  }, [index, total, scale, rotation, scaleEnabled, rotationEnabled]);

  const animatedStyle = useAnimatedStyle(() => {
    const counterRotation = counterRotationValue?.value ?? 0;
    const totalRotation = rotationEnabled
      ? rotation.value - counterRotation
      : -counterRotation;
    return {
      transform: [{ scale: scale.value }, { rotate: `${totalRotation}deg` }],
    };
  }, [rotationEnabled]);

  return (
    <Animated.View
      style={[animatedStyle, style]}
      className={cn("relative", className)}
    >
      {children}
    </Animated.View>
  );
};

export default RotationCard;

const stableThumbRotation = (index: number, total: number): number => {
  // Simple seeded pseudo-random based on index + total for stability
  const seed =
    (index + 1) * SEED_INDEX_MULTIPLIER + total * SEED_TOTAL_MULTIPLIER;
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  const deg = rand * 40 - 20; // -20..20
  return parseFloat(deg.toFixed(2));
};

const stableThumbScale = (index: number, total: number): number => {
  // Simple seeded pseudo-random based on index + total for stability
  const seed =
    (index + 1) * SEED_INDEX_MULTIPLIER + total * SEED_TOTAL_MULTIPLIER;
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  const scale = rand * 0.4 + 0.8; // 0.8..1.2
  return parseFloat(scale.toFixed(2));
};
