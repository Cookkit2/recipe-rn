import { useSharedValue, useAnimatedStyle, withTiming, runOnUI } from "react-native-reanimated";

import { CURVES } from "~/constants/curves";

/**
 * Animates border radius on press interactions, creating a "squaring" effect when pressed.
 *
 * Contract
 * - Input: rounded (optional starting border radius value)
 * - Output: animatedStyle with animated borderRadius, handlePressIn/handlePressOut worklet handlers
 * - Behavior: Press in doubles the border radius (more rounded), press out returns to original value.
 *   Uses Reanimated worklets for UI-thread performance.
 *
 * @param rounded - The base border radius value that gets doubled on press (default: 12)
 *
 * @remarks
 * Both handlers use the "worklet" directive to ensure they run on the UI thread
 * for optimal animation performance with Reanimated.
 */
const useOnPressRounded = (rounded = 12) => {
  const borderRadius = useSharedValue(rounded);

  const animatedStyle = useAnimatedStyle(() => ({
    borderRadius: borderRadius.value,
  }));

  const handlePressIn = () => {
    "worklet";
    borderRadius.value = withTiming(rounded * 2, CURVES["expressive.fast.effects"]);
  };

  const handlePressOut = () => {
    "worklet";
    borderRadius.value = withTiming(rounded, CURVES["expressive.fast.effects"]);
  };

  return { animatedStyle, handlePressIn, handlePressOut };
};

export default useOnPressRounded;
