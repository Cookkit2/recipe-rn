import * as ProgressPrimitive from "@rn-primitives/progress";
import React from "react";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  runOnJS,
  type SharedValue,
  useSharedValue,
  withDelay,
} from "react-native-reanimated";
import { cn } from "~/lib/tw-merge";
import { CURVES } from "~/constants/curves";

function Progress({
  className,
  value,
  animatedValue,
  indicatorClassName,
  ...props
}: ProgressPrimitive.RootProps & {
  ref?: React.RefObject<ProgressPrimitive.RootRef>;
  indicatorClassName?: string;
  value?: number | undefined | null;
  animatedValue?: SharedValue<number>;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-4 w-full rounded-full bg-secondary", className)}
      {...props}
    >
      <Indicator
        value={value}
        animatedValue={animatedValue}
        className={indicatorClassName}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

function Indicator({
  value,
  animatedValue,
  className,
}: {
  value?: number | undefined | null;
  animatedValue?: SharedValue<number>;
  className?: string;
}) {
  const starburstTrigger = useSharedValue(0);

  const progress = useDerivedValue(() => {
    if (animatedValue) {
      return animatedValue.value;
    }
    return value ?? 0;
  });

  const wasComplete = React.useRef(false);

  const triggerStarburst = React.useCallback(() => {
    starburstTrigger.value = withDelay(
      0,
      withTiming(1, CURVES["expressive.fast.effects"])
    );

    // Reset after animation
    setTimeout(() => {
      starburstTrigger.value = 0;
    }, 1000);
  }, [starburstTrigger]);

  // Monitor progress completion for starburst trigger
  useDerivedValue(() => {
    const currentProgress = progress.value;

    if (currentProgress >= 10 && !wasComplete.current) {
      wasComplete.current = true;
      runOnJS(triggerStarburst)();
    } else if (currentProgress < 100) {
      wasComplete.current = false;
    }
  });

  const indicator = useAnimatedStyle(() => {
    return {
      width: `${interpolate(progress.value, [0, 100], [0, 100], Extrapolation.CLAMP)}%`,
    };
  });

  // if (Platform.OS === "web") {
  //   const currentValue = animatedValue ? animatedValue.value : (value ?? 0);
  //   return (
  //     <>
  //       <View
  //         className={cn(
  //           "h-full w-full flex-1 bg-primary web:transition-all",
  //           className
  //         )}
  //         style={{ transform: `translateX(-${100 - currentValue}%)` }}
  //       >
  //         <ProgressPrimitive.Indicator
  //           className={cn("h-full w-full", className)}
  //         />
  //       </View>
  //     </>
  //   );
  // }

  return (
    <>
      <ProgressPrimitive.Indicator asChild>
        <Animated.View
          style={indicator}
          className={cn(
            "h-full bg-foreground rounded-full shadow-md",
            className
          )}
        />
      </ProgressPrimitive.Indicator>
      {/* <Starburst triggerAnimation={starburstTrigger} progress={progress} /> */}
    </>
  );
}
