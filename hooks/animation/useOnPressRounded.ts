import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnUI,
} from "react-native-reanimated";

import { CURVES } from "~/constants/curves";

const useOnPressRounded = (rounded = 12) => {
  const borderRadius = useSharedValue(rounded);

  const animatedStyle = useAnimatedStyle(() => ({
    borderRadius: borderRadius.value,
  }));

  const handlePressIn = () => {
    runOnUI(() => {
      "worklet";
      borderRadius.value = withTiming(
        rounded * 2,
        CURVES["expressive.fast.effects"]
      );
    })();
  };

  const handlePressOut = () => {
    runOnUI(() => {
      "worklet";
      borderRadius.value = withTiming(
        rounded,
        CURVES["expressive.fast.effects"]
      );
    })();
  };

  return { animatedStyle, handlePressIn, handlePressOut };
};

export default useOnPressRounded;
