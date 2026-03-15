import React, { useMemo } from "react";
import { View, type ViewProps } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { cn } from "~/lib/utils";
import useColors from "~/hooks/useColor";

type TextShimmerProps = Omit<ViewProps, "children"> & {
  children: React.ReactNode;
  className?: string;
  durationSec?: number; // seconds
  spread?: number; // pixels per character multiplier
  colors?: { base: string; highlight: string };
};

/**
 * Shimmering gradient text using MaskedView + LinearGradient + Reanimated.
 * - durationSec: animation duration in seconds
 * - spread: controls gradient width relative to text length (px per char)
 */
export default function TextShimmer({
  children,
  className,
  durationSec = 8,
  spread = 2,
  colors,
  ...props
}: TextShimmerProps) {
  const systemColors = useColors();

  const currentColors = colors || {
    base: systemColors.background,
    highlight: systemColors.muted,
  };

  const gradientWidth = useMemo(() => {
    const width = Math.max(120, Math.floor(String(children).length * spread * 8));
    // Ensure a minimum width to cover short strings and look smooth
    return width;
  }, [children, spread]);

  const translateX = useSharedValue(gradientWidth);

  React.useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-gradientWidth, {
        duration: Math.max(300, Math.floor(durationSec * 1000)),
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [durationSec, gradientWidth, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      // Move diagonally to match 45° gradient orientation
      { translateY: translateX.value },
    ],
  }));

  return (
    <MaskedView
      maskElement={
        <View {...props} className={cn(className)}>
          {children}
        </View>
      }
    >
      <View pointerEvents="none">
        {/* Base color background to mimic bg-clip:text with base color */}
        <View {...props} className={cn(className)}>
          {children}
        </View>
        {/* Moving highlight gradient */}
        <Animated.View
          className="absolute top-0 bottom-0"
          style={[{ left: -gradientWidth, right: -gradientWidth }, animatedStyle]}
        >
          <LinearGradient
            // 45° diagonal sweep
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={[
              "transparent", // Transparent start
              currentColors.highlight,
              "transparent", // Transparent end
            ]}
            locations={[0.3, 0.5, 0.7]}
            // Make gradient tall enough so diagonal translation never leaves gaps
            style={{ width: gradientWidth * 2, height: gradientWidth * 2 }}
          />
        </Animated.View>
      </View>
    </MaskedView>
  );
}
