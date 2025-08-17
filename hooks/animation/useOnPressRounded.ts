import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { CURVES } from "~/constants/curves";

const useOnPressRounded = (rounded = 12) => {
  const borderRadius = useSharedValue(rounded);

  const animatedStyle = useAnimatedStyle(() => ({
    borderRadius: borderRadius.value,
  }));

  const handlePressIn = () => {
    "worklet";
    borderRadius.value = withTiming(
      rounded * 2,
      CURVES["expressive.fast.effects"]
    );
  };

  const handlePressOut = () => {
    "worklet";
    borderRadius.value = withTiming(rounded, CURVES["expressive.fast.effects"]);
  };

  return { animatedStyle, handlePressIn, handlePressOut };
};

export default useOnPressRounded;
