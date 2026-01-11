import { router } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { ScrollView } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedRef,
  withTiming,
  runOnJS,
  withSpring,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedReaction,
  type AnimatedRef,
} from "react-native-reanimated";
import { useRootScale } from "~/store/RootScaleContext";
import * as Haptics from "expo-haptics";
import {
  SCALE_FACTOR,
  ENABLE_HORIZONTAL_DRAG_CLOSE,
  DIRECTION_LOCK_ANGLE,
  HORIZONTAL_DRAG_THRESHOLD,
  DRAG_THRESHOLD,
} from "~/constants/sheet-modal";
import { log } from "~/utils/logger";

export default function SheetModalWrapper({
  children,
}: {
  children: (props: {
    ScrollComponent: (
      props: React.ComponentProps<typeof ScrollView>
    ) => React.ReactElement;
    scrollRef: AnimatedRef<Animated.ScrollView>;
  }) => React.ReactNode;
}) {
  const { setScale } = useRootScale();
  const isClosing = useRef(false);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const shouldScale = useSharedValue(SCALE_FACTOR);

  const translateY = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const translateX = useSharedValue(0);
  const initialGestureX = useSharedValue(0);
  const initialGestureY = useSharedValue(0);
  const isHorizontalGesture = useSharedValue(false);
  const isScrolling = useSharedValue(false);

  const handleHapticFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
      log.warn("Haptics not available:", error);
    });
  }, []);

  const goBack = useCallback(() => {
    if (!isClosing.current) {
      isClosing.current = true;
      handleHapticFeedback();
      router.back();
    }
  }, [handleHapticFeedback]);

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      "worklet";
      initialGestureX.value = event.x;
      initialGestureY.value = event.y;
      isHorizontalGesture.value = false;

      if (scrollOffset.value <= 0) {
        isDragging.value = true;
      }
    })
    .onUpdate((event) => {
      "worklet";
      const dx = event.translationX;
      const dy = event.translationY;

      if (
        ENABLE_HORIZONTAL_DRAG_CLOSE &&
        !isHorizontalGesture.value &&
        !isScrolling.value
      ) {
        if (Math.abs(dx) > 10) {
          // Calculate angle only when needed and use simpler calculation
          const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
          if (angle < DIRECTION_LOCK_ANGLE) {
            isHorizontalGesture.value = true;
          }
        }
      }

      if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
        translateX.value = dx;
        translateY.value = dy;
      } else if (scrollOffset.value <= 0 && isDragging.value) {
        translateY.value = Math.max(0, dy);
      }
    })
    .onEnd((event) => {
      "worklet";
      isDragging.value = false;

      if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
        const dx = event.translationX;
        const dy = event.translationY;
        const totalDistance = Math.sqrt(dx * dx + dy * dy);
        const shouldClose = totalDistance > HORIZONTAL_DRAG_THRESHOLD;

        if (shouldClose) {
          const exitX = dx * 2;
          const exitY = dy * 2;

          translateX.value = withTiming(exitX, { duration: 300 });
          translateY.value = withTiming(exitY, { duration: 300 });
          shouldScale.value = 1;

          runOnJS(handleHapticFeedback)();
          runOnJS(goBack)();
        } else {
          translateX.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
          shouldScale.value = SCALE_FACTOR;
        }
      } else if (scrollOffset.value <= 0) {
        const shouldClose = event.translationY > DRAG_THRESHOLD;

        if (shouldClose) {
          translateY.value = withTiming(event.translationY + 100, {
            duration: 300,
          });
          shouldScale.value = 1;
          runOnJS(handleHapticFeedback)();
          runOnJS(goBack)();
        } else {
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
          shouldScale.value = SCALE_FACTOR;
        }
      }
    })
    .onFinalize(() => {
      "worklet";
      isDragging.value = false;
      isHorizontalGesture.value = false;
    });

  const scrollGesture = Gesture.Native()
    .onBegin(() => {
      "worklet";
      isScrolling.value = true;
      if (!isDragging.value) {
        translateY.value = 0;
      }
    })
    .onEnd(() => {
      "worklet";
      isScrolling.value = false;
    });

  const composedGestures = Gesture.Simultaneous(panGesture, scrollGesture);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
      // Only reset translateY if we're actually dragging down and starting to scroll
      if (!isDragging.value && translateY.value > 0) {
        translateY.value = 0;
      }
    },
  });

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
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: withSpring(1),
  }));

  // Batch scale updates to reduce bridge calls
  useAnimatedReaction(
    () => shouldScale.value,
    (currentScale, previousScale) => {
      if (currentScale !== previousScale) {
        runOnJS(setScale)(currentScale);
      }
    }
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        setScale(SCALE_FACTOR);
      } catch (error) {
        log.error("Initial scale error:", error);
      }
    }, 0);

    return () => {
      clearTimeout(timeout);
      try {
        setScale(1);
      } catch (error) {
        log.error("Cleanup scale error:", error);
      }
    };
  }, [setScale]);

  return (
    <Animated.View className="flex h-full" style={[animatedStyle]}>
      {children({
        ScrollComponent,
        scrollRef,
      })}
    </Animated.View>
  );
}
