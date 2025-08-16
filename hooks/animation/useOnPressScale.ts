import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";

const useOnPressScale = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
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
