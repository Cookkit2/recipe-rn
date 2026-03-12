import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";

/**
 * Animates scale transform on press interactions with a "bounce" effect on release.
 *
 * Contract
 * - Input: none (uses hardcoded scale values)
 * - Output: animatedStyle with animated scale transform, handlePressIn/handlePressOut worklet handlers
 * - Behavior: Press in scales down to 0.95x. Press out triggers a bounce sequence:
 *   scales up to 1.05x (overshoot), then settles back to 1.0x (original).
 *   Uses Reanimated worklets for UI-thread performance.
 *
 * @remarks
 * Both handlers use the "worklet" directive to ensure they run on the UI thread
 * for optimal animation performance with Reanimated. The bounce effect on press out
 * uses withSequence to chain two animations together.
 */
const useOnPressScale = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    "worklet";
    scale.value = withTiming(0.95, CURVES["expressive.fast.effects"]);
  };

  const handlePressOut = () => {
    "worklet";
    scale.value = withSequence(
      withTiming(1.05, CURVES["expressive.fast.effects"]),
      withTiming(1, CURVES["expressive.fast.effects"])
    );
  };

  return { animatedStyle, handlePressIn, handlePressOut };
};

export default useOnPressScale;
