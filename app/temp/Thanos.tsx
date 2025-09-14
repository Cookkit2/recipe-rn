import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { Pressable, View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Defs,
  Filter,
  FeTurbulence,
  FeComponentTransfer,
  FeFuncR,
  FeFuncG,
  FeMerge,
  FeMergeNode,
  FeDisplacementMap,
} from "react-native-svg";

const DURATION_MS = 600;
const MAX_DISPLACEMENT = 300;
const OPACITY_CHANGE_START = 0.5;

const customEasing = Easing.bezier(0, 0, 0.2, 1); // Approximates the cubic ease

export type ThanosSnapHandle = {
  handlePress: () => void;
  resetAnimation: () => void;
};

interface ThanosSnapEffectProps {
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ThanosSnapEffect = forwardRef<
  ThanosSnapHandle,
  ThanosSnapEffectProps
>(function ThanosSnapEffect({ children }: ThanosSnapEffectProps, ref) {
  const isAnimating = useRef(false);

  // Animated values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const displacement = useSharedValue(0);

  const resetAnimation = useCallback(() => {
    "worklet";
    scale.value = 1;
    opacity.value = 1;
    displacement.value = 0;
    runOnJS(() => {
      isAnimating.current = false;
    })();
  }, [displacement, opacity, scale]);

  const handlePress = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    // Scale and opacity animation
    scale.value = withTiming(1.2, {
      duration: DURATION_MS,
      easing: customEasing,
    });

    // Opacity animation with delay for the snap effect
    opacity.value = withTiming(
      1,
      {
        duration: DURATION_MS * OPACITY_CHANGE_START,
        easing: customEasing,
      },
      () => {
        opacity.value = withTiming(0, {
          duration: DURATION_MS * (1 - OPACITY_CHANGE_START),
          easing: customEasing,
        });
      }
    );

    // Displacement animation for the dissolve effect
    displacement.value = withTiming(MAX_DISPLACEMENT, {
      duration: DURATION_MS,
      easing: customEasing,
    });
  }, [displacement, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  useImperativeHandle(
    ref,
    () => ({
      handlePress,
      resetAnimation,
    }),
    [handlePress, resetAnimation]
  );

  return (
    <View className="absolute inset-0 bg-red-500">
      <AnimatedPressable
        onPress={handlePress}
        className="absolute inset-0"
        style={[animatedStyle, styles.content]}
      >
        {children}
      </AnimatedPressable>

      {/* SVG Filter Definition */}
      <Svg width={0} height={0} style={styles.svgHidden}>
        <Defs>
          <Filter
            id="dissolve-filter"
            x="-300%"
            y="-300%"
            width="600%"
            height="600%"
            // colorInterpolationFilters="sRGB"
          >
            <FeTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves={1}
              result="bigNoise"
            />
            <FeComponentTransfer in="bigNoise" result="bigNoiseAdjusted">
              <FeFuncR type="linear" slope="0.5" intercept="-0.2" />
              <FeFuncG type="linear" slope="3" intercept="-0.6" />
            </FeComponentTransfer>
            <FeTurbulence
              type="fractalNoise"
              baseFrequency="1"
              numOctaves={2}
              result="fineNoise"
            />
            <FeMerge result="combinedNoise">
              <FeMergeNode in="bigNoiseAdjusted" />
              <FeMergeNode in="fineNoise" />
            </FeMerge>
            <FeDisplacementMap
              in="SourceGraphic"
              in2="combinedNoise"
              scale={displacement.value}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </Filter>
        </Defs>
      </Svg>
    </View>
  );
});

// Alternative implementation using particle effect simulation
// (More reliable across React Native platforms)
export function ThanosSnapEffectAlternative({
  children,
}: ThanosSnapEffectProps) {
  const isAnimating = useRef(false);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const particleOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0.8);

  const resetAnimation = () => {
    "worklet";
    scale.value = 1;
    opacity.value = 1;
    particleOpacity.value = 0;
    particleScale.value = 0.8;
    runOnJS(() => {
      isAnimating.current = false;
    })();
  };

  const handlePress = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    // Main element animation
    scale.value = withTiming(1.2, {
      duration: DURATION_MS,
      easing: customEasing,
    });

    // Fade out effect
    opacity.value = withTiming(
      1,
      {
        duration: DURATION_MS * OPACITY_CHANGE_START,
        easing: customEasing,
      },
      () => {
        opacity.value = withTiming(0, {
          duration: DURATION_MS * (1 - OPACITY_CHANGE_START),
          easing: customEasing,
        });
      }
    );

    // Particle effect simulation
    particleOpacity.value = withTiming(
      0.6,
      {
        duration: DURATION_MS * 0.3,
        easing: customEasing,
      },
      () => {
        particleOpacity.value = withTiming(0, {
          duration: DURATION_MS * 0.7,
          easing: customEasing,
        });
      }
    );

    particleScale.value = withTiming(
      1.5,
      {
        duration: DURATION_MS,
        easing: customEasing,
      },
      () => {
        setTimeout(() => {
          runOnJS(resetAnimation)();
        }, 500);
      }
    );
  };

  const mainAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const particleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: particleOpacity.value,
      transform: [{ scale: particleScale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress}>
        <View>
          <Animated.View style={[mainAnimatedStyle]}>{children}</Animated.View>

          {/* Particle effect overlay */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              particleAnimatedStyle,
              styles.particleOverlay,
            ]}
          >
            <View style={styles.particle} />
            <View style={[styles.particle, styles.particle2]} />
            <View style={[styles.particle, styles.particle3]} />
            <View style={[styles.particle, styles.particle4]} />
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  content: {
    // Note: SVG filters may not work consistently across all React Native platforms
    // Consider using alternative effects like opacity masks or particle systems
  },
  svgHidden: {
    position: "absolute",
    zIndex: -1,
  },

  particleOverlay: {
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    backgroundColor: "#8B5CF6",
    borderRadius: 2,
    top: "20%",
    left: "30%",
  },
  particle2: {
    top: "60%",
    left: "70%",
    backgroundColor: "#EC4899",
  },
  particle3: {
    top: "40%",
    left: "80%",
    backgroundColor: "#F59E0B",
    width: 3,
    height: 3,
  },
  particle4: {
    top: "80%",
    left: "20%",
    backgroundColor: "#10B981",
    width: 2,
    height: 2,
  },
});
