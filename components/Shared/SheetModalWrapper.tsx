import { router } from "expo-router";
import React, { useCallback, useRef } from "react";
import { ScrollView } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedRef,
  withSpring,
  useAnimatedStyle,
  type AnimatedRef,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { log } from "~/utils/logger";
import { useSheetModalGestures } from "~/hooks/useSheetModalGestures";

const handleHapticFeedback = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
    log.warn("Haptics not available:", error);
  });
};

export default function SheetModalWrapper({
  children,
}: {
  children: (props: {
    ScrollComponent: (props: React.ComponentProps<typeof ScrollView>) => React.ReactElement;
    scrollRef: AnimatedRef<Animated.ScrollView>;
  }) => React.ReactNode;
}) {
  const isClosing = useRef(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  const goBack = useCallback(() => {
    if (!isClosing.current) {
      isClosing.current = true;
      handleHapticFeedback();
      router.back();
    }
  }, []);

  const { composedGestures, scrollHandler, translateX, translateY } = useSheetModalGestures(
    goBack,
    handleHapticFeedback
  );

  const ScrollComponent = useCallback(
    (props: React.ComponentProps<typeof ScrollView>) => {
      return (
        <GestureDetector gesture={composedGestures}>
          <Animated.ScrollView
            {...props}
            ref={scrollRef}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            bounces={true}
          />
        </GestureDetector>
      );
    },
    [composedGestures, scrollHandler, scrollRef]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { translateX: translateX.value }],
    opacity: withSpring(1),
  }));

  return (
    <Animated.View className="flex h-full" style={[animatedStyle]}>
      {children({
        ScrollComponent,
        scrollRef,
      })}
    </Animated.View>
  );
}
