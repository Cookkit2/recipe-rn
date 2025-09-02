import React, { useState } from "react";
import { Dimensions, useWindowDimensions, View } from "react-native";
import { Button } from "../../ui/button";
import { ArrowLeftIcon, HeartIcon } from "lucide-nativewind";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import { H4 } from "~/components/ui/typography";
import { CURVES } from "~/constants/curves";
import { SystemBars } from "react-native-edge-to-edge";

export default function TopBar({
  id,
  scrollOffset,
  title,
}: {
  id: string;
  scrollOffset: SharedValue<number>;
  title: string;
}) {
  const { width } = useWindowDimensions();
  const { top } = useSafeAreaInsets();

  const [isFav, setIsFav] = useState(false);

  const router = useRouter();

  const toggleRecipeFavourite = () => {
    setIsFav((v) => !v);
  };

  // Function to update status bar style (needs to run on JS thread)
  const updateStatusBarStyle = (isLight: boolean) => {
    SystemBars.setStyle(isLight ? "light" : "dark");
  };

  // Subscribe to scroll offset changes using Reanimated
  useAnimatedReaction(
    () => scrollOffset.value,
    (currentValue) => {
      const shouldUseDarkStyle = currentValue < width * 0.7;
      runOnJS(updateStatusBarStyle)(shouldUseDarkStyle);
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

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const isVisible = scrollOffset.value > width * 0.7;

    const borderBottomWidth = withTiming(
      isVisible ? 1 : 0,
      CURVES["expressive.fast.effects"]
    );

    return { borderBottomWidth };
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
      className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-6 py-2 z-[1] border-border"
      style={[{ paddingTop: top + 8 }, borderAnimatedStyle]}
      pointerEvents="box-none"
    >
      <Animated.View
        className="absolute inset-0 bg-background"
        style={backgroundOpacityStyle}
      />
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={() => router.back()}
      >
        <ArrowLeftIcon className="text-foreground" size={20} />
      </Button>
      <View className="overflow-hidden h-8 justify-center">
        <Animated.View style={titleAnimatedStyle}>
          <H4 className="font-urbanist-semibold tracking-wide">{title}</H4>
        </Animated.View>
      </View>
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={toggleRecipeFavourite}
      >
        <HeartIcon
          className={isFav ? "text-red-500" : "text-foreground"}
          size={20}
        />
      </Button>
    </Animated.View>
  );
}
