import { useCallback, type ReactNode } from "react";
import Animated, { withSpring, withTiming } from "react-native-reanimated";

export function getSearchPullOffset(value: string | string[] | undefined, height: number) {
  const offset = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(offset) ? Math.min(height / 2, Math.max(0, offset)) : 0;
}

/** Continue the list's visible pull from the same position, then settle into search. */
export function SearchEntrance({ offset, children }: { offset: number; children: ReactNode }) {
  const entering = useCallback(() => {
    "worklet";
    return {
      initialValues: { opacity: 0.55, transform: [{ translateY: offset }] },
      animations: {
        opacity: withTiming(1, { duration: 140 }),
        transform: [{ translateY: withSpring(0, { damping: 24, stiffness: 260, mass: 0.8 }) }],
      },
    };
  }, [offset]);

  return (
    <Animated.View
      testID="search-pull-entrance"
      collapsable={false}
      entering={offset > 0 ? entering : undefined}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  );
}
