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
 * - Behavior:
 *   - Stores measured layouts for all items keyed by index
 *   - Ring initializes to the selected item's layout on first measurement
 *   - When selectedIndex changes, ring animates (springs) to the new item's rect
 *   - Uses spring animations configured with SPRING_CONFIG for smooth motion
 *
 * @param selectedIndex - The index of the currently selected item
 * @returns Object containing:
 *   - onItemLayout: Function that returns a layout event handler for each item
 *   - ringStyle: Animated style with transform (translateX, translateY) and dimensions (width, height)
 *
 * @remarks
 * The ring's position is absolute (transform-based) rather than relative,
 * allowing it to move freely across the screen. Layout measurements are
 * persisted in a ref keyed by index for efficient lookup.
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
