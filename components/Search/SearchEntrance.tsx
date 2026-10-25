import type { ReactNode } from "react";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

/** Search and Pantry read the same live pull, without a native route transition. */
export function SearchEntrance({
  offset,
  progress,
  interactive,
  children,
}: {
  offset: SharedValue<number>;
  progress: SharedValue<number>;
  interactive: boolean;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: offset.value }],
  }));
  return (
    <Animated.View
      testID="search-pull-entrance"
      collapsable={false}
      pointerEvents={interactive ? "auto" : "none"}
      style={[{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }, style]}
    >
      {children}
    </Animated.View>
  );
}
