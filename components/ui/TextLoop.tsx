import React, {
  useState,
  useEffect,
  Children,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { View, type ViewProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";
import { cn } from "~/lib/tw-merge";

export type TextLoopProps = Omit<ViewProps, "children"> & {
  children: React.ReactNode[];
  className?: string;
  interval?: number;
  onIndexChange?: (index: number) => void;

  // Trigger the auto animation
  trigger?: boolean;
  targetIndex?: number;
};

export type TextLoopRef = {
  animateToIndex: (index: number) => void;
  animateToNext: () => void;
};

export const TextLoop = forwardRef<TextLoopRef, TextLoopProps>(
  function TextLoop(
    {
      children,
      className,
      interval = 2,
      onIndexChange,
      trigger = true,
      targetIndex,
      style,
      ...props
    },
    ref
  ) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const items = Children.toArray(children);
    const intervalRef = useRef<number | null>(null);

    const opacity = useSharedValue(1);
    const translateY = useSharedValue(0);

    const updateIndex = useCallback(
      (newIndex?: number) => {
        setCurrentIndex((current) => {
          const next =
            newIndex !== undefined ? newIndex : (current + 1) % items.length;
          onIndexChange?.(next);
          return next;
        });
      },
      [items.length, onIndexChange]
    );

    const animateToNext = useCallback(() => {
      "worklet";
      // Start exit animation
      opacity.value = withTiming(0, CURVES["expressive.fast.effects"]);
      translateY.value = withTiming(
        -20,
        CURVES["expressive.fast.spatial"],
        (finished) => {
          "worklet";
          if (finished) {
            // Update index on main thread
            runOnJS(updateIndex)();

            // Reset position and start enter animation
            translateY.value = 20;
            opacity.value = withTiming(1, CURVES["expressive.fast.effects"]);
            translateY.value = withTiming(0, CURVES["expressive.fast.spatial"]);
          }
        }
      );
    }, [opacity, translateY, updateIndex]);

    const animateToIndex = useCallback(
      (index: number) => {
        "worklet";
        if (index < 0 || index >= items.length || index === currentIndex)
          return;

        // Start exit animation
        opacity.value = withTiming(0, CURVES["expressive.default.effects"]);
        translateY.value = withTiming(
          -20,
          CURVES["expressive.default.spatial"],
          (finished) => {
            "worklet";
            if (finished) {
              // Update index on main thread
              runOnJS(updateIndex)(index);

              // Reset position and start enter animation
              translateY.value = 20;
              opacity.value = withTiming(
                1,
                CURVES["expressive.default.effects"]
              );
              translateY.value = withTiming(
                0,
                CURVES["expressive.default.spatial"]
              );
            }
          }
        );
      },
      [opacity, translateY, updateIndex, items.length, currentIndex]
    );

    useImperativeHandle(
      ref,
      () => ({
        animateToIndex,
        animateToNext,
      }),
      [animateToIndex, animateToNext]
    );

    // Trigger animation when targetIndex changes
    useEffect(() => {
      if (targetIndex !== undefined && targetIndex !== currentIndex) {
        animateToIndex(targetIndex);
      }
    }, [targetIndex, currentIndex, animateToIndex]);

    useEffect(() => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (!trigger || items.length <= 1) return;

      const intervalMs = interval * 1000;
      intervalRef.current = setInterval(animateToNext, intervalMs);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [interval, trigger, animateToNext, items.length]);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
      };
    });

    return (
      <View
        {...props}
        style={style}
        className={cn("relative overflow-hidden", className)}
      >
        <Animated.View style={animatedStyle}>
          {items[currentIndex]}
        </Animated.View>
      </View>
    );
  }
);

export default TextLoop;
