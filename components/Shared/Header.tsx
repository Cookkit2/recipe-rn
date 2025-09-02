import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeftIcon } from "lucide-nativewind";
import { Button } from "../ui/button";
import { H4 } from "../ui/typography";
import Animated, {
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";

interface HeaderProps {
  title?: string;
  scrollOffset?: SharedValue<number>;
}

export default function Header({ title, scrollOffset }: HeaderProps) {
  const { top } = useSafeAreaInsets();
  const router = useRouter();

  // Animated styles for the title
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const isVisible = (scrollOffset?.value ?? 0) > 60;

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
    const isVisible = (scrollOffset?.value ?? 0) > 20;

    const borderBottomWidth = withTiming(
      isVisible ? 1 : 0,
      CURVES["expressive.fast.effects"]
    );
    return { borderBottomWidth };
  });

  return (
    <Animated.View
      className="flex-row items-center px-6 py-2 bg-background border-border"
      style={[{ paddingTop: top }, borderAnimatedStyle]}
    >
      <Button
        size="icon"
        variant="secondary"
        className="rounded-full"
        onPress={() => router.back()}
      >
        <ArrowLeftIcon
          className="text-foreground"
          size={20}
          strokeWidth={2.618}
        />
      </Button>
      <View className="flex-1" />
      {title && (
        <View className="overflow-hidden h-8 justify-center">
          <Animated.View style={titleAnimatedStyle}>
            <H4 className="font-urbanist-semibold tracking-wide">{title}</H4>
          </Animated.View>
        </View>
      )}
      <View className="flex-1" />
      <Button size="icon" variant="ghost" className="rounded-full" disabled>
        <ArrowLeftIcon className="text-background" size={1} />
      </Button>
    </Animated.View>
  );
}
