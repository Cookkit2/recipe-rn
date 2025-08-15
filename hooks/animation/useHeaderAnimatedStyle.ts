import {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

export default function useHeaderAnimatedStyle(
  scrollOffset: SharedValue<number>,
  windowWidth: number
) {
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-windowWidth, 0, windowWidth],
            [-windowWidth / 2, 0, windowWidth * 0.75]
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-windowWidth, 0, windowWidth],
            [2, 1, 1]
          ),
        },
      ],
    };
  });

  return headerAnimatedStyle;
}
