import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { H4 } from "~/components/ui/typography";
import { CURVES } from "~/constants/curves";
import { setStatusBarStyle } from "expo-status-bar";
import { scheduleOnRN } from "react-native-worklets";
import useColors from "~/hooks/useColor";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedH4 = Animated.createAnimatedComponent(H4);

export default function TopBar({
  scrollOffset,
  title,
}: {
  scrollOffset: SharedValue<number>;
  title: string;
}) {
  const { width } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const colors = useColors();

  // Function to update status bar style (needs to run on JS thread)
  const updateStatusBarStyle = (isLight: boolean) => {
    setStatusBarStyle(isLight ? "light" : "auto", true);
  };

  // Subscribe to scroll offset changes using Reanimated
  useAnimatedReaction(
    () => scrollOffset.value,
    (currentValue) => {
      const shouldUseDarkStyle = currentValue < width * 0.8;
      scheduleOnRN(updateStatusBarStyle, shouldUseDarkStyle);
    },
    [scrollOffset]
  );

  // Animated styles for the title
  const titleAnimatedStyle = useAnimatedStyle(() => {
    // Animate translateY and opacity based on scroll threshold
    const isVisible = scrollOffset.value > width * 0.9;

    const translateY = withTiming(
      isVisible ? 0 : 5,
      CURVES["expressive.fast.spatial"]
    );

    const opacity = withTiming(
      isVisible ? 1 : 0,
      CURVES["expressive.fast.effects"]
    );

    return { transform: [{ translateY }], opacity };
  });



  const backgroundOpacityStyle = useAnimatedStyle(() => {
    const isVisible = scrollOffset.value > width * 0.7;

    const opacity = withTiming(
      isVisible ? 1 : 0,
      CURVES["expressive.fast.effects"]
    );

    return { opacity };
  });

  return (
    <Animated.View
      className="absolute top-0 left-0 right-0 flex-row items-center justify-center px-6 py-2 z-1"
      style={[{ paddingTop: top + 8 }]}
      pointerEvents="box-none"
    >
      <AnimatedLinearGradient
        colors={[colors.background.toString(), colors.background.toString(), "transparent"]}
        className="absolute inset-0"
        style={backgroundOpacityStyle}
      />

      {/* Center title */}
      <View className="overflow-hidden h-8 justify-center max-w-[70%]">
        <AnimatedH4
          style={titleAnimatedStyle}
          className="font-bowlby-one text-center"
          numberOfLines={1}
        >
          {title}
        </AnimatedH4>
      </View>
    </Animated.View>
  );
}
