import { useEffect, useRef } from "react";
import type { LayoutChangeEvent, LayoutRectangle } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SPRING_CONFIG } from "~/constants/spring-config";

/**
 * Drives an animated selection "ring" that moves and resizes to match the
 * layout of the currently selected item.
 *
 * Contract
 * - Input: selectedIndex (number of the selected item)
 * - Output: onItemLayout(index) handler and animated ringStyle
 * - Behavior: When any item's layout is measured and when selectedIndex
 *   changes, the ring animates to the target item's rect.
 */
export default function useSelectionRing(selectedIndex: number) {
  // Store measured layouts keyed by index
  const layoutsRef = useRef<Record<number, LayoutRectangle>>({});

  // Animated values for the ring's position and size
  const ringX = useSharedValue(0);
  const ringY = useSharedValue(0);
  const ringW = useSharedValue(0);
  const ringH = useSharedValue(0);

  const onItemLayout = (index: number) => (e: LayoutChangeEvent) => {
    layoutsRef.current[index] = e.nativeEvent.layout;
    const target = layoutsRef.current[selectedIndex];
    // Initialize ring to the selected index when we have its first measurement
    if (target && ringW.value === 0) {
      ringX.value = target.x;
      ringY.value = target.y;
      ringW.value = target.width;
      ringH.value = target.height;
    }
  };

  // Animate ring when selection changes and we have a measured target
  useEffect(() => {
    const target = layoutsRef.current[selectedIndex];
    if (!target) return;
    ringX.value = withSpring(target.x, SPRING_CONFIG);
    ringY.value = withSpring(target.y, SPRING_CONFIG);
    ringW.value = withSpring(target.width, SPRING_CONFIG);
    ringH.value = target.height;
    // ringH.value = withSpring(target.height, SPRING_CONFIG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: ringX.value }, { translateY: ringY.value }],
    width: ringW.value,
    height: ringH.value,
  }));

  return { onItemLayout, ringStyle } as const;
}
