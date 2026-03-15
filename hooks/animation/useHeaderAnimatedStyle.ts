import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Creates animated header styles that respond to scroll offset with parallax and scale effects.
 *
 * Contract
 * - Input: scrollOffset (SharedValue<number> tracking scroll position), windowWidth (screen width for interpolation ranges)
 * - Output: headerAnimatedStyle with transform properties
 * - Behavior: As user scrolls, header translates vertically (parallax effect) and scales based on scroll position.
 *   At -windowWidth: translates up by half windowWidth, scales to 2x.
 *   At 0: no translation, scale 1x (normal).
 *   At +windowWidth: translates down by 0.75x windowWidth, scale clamped at 1x.
 *
 * @param scrollOffset - Reanimated SharedValue tracking the scroll position
 * @param windowWidth - Screen width used to calculate interpolation ranges
 */
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
            [2, 1, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  return headerAnimatedStyle;
}
