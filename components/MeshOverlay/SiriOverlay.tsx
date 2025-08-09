import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { MeshGradientView } from "expo-mesh-gradient";

type SiriOverlayProps = {
  onDone?: () => void;
  size?: number;
};

export default function SiriOverlay({ onDone, size = 280 }: SiriOverlayProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const translateY = useSharedValue(20);

  useEffect(() => {
    // Entry: fade/scale/float in, brief pulse, then fade out and complete
    opacity.value = withSequence(
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      withDelay(
        200,
        withTiming(
          0,
          { duration: 320, easing: Easing.inOut(Easing.quad) },
          (finished) => {
            if (finished && onDone) runOnJS(onDone)();
          }
        )
      )
    );

    scale.value = withSequence(
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
      withTiming(1.07, { duration: 160, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) })
    );

    translateY.value = withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [onDone, opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 items-center justify-end pb-24"
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: "hidden",
          },
          animatedStyle,
        ]}
        className="shadow-xl"
      >
        <MeshGradientView
          className="flex-1"
          // A soft, Siri-like palette
          colors={[
            "#5E5CE6", // indigo
            "#32ADE6", // cyan
            "#FF2D55", // pink/red
            "#AF52DE", // purple
            "#34C759", // green accent
            "#FFD60A", // yellow accent
            "#5856D6", // deeper indigo
            "#0A84FF", // blue
            "#FF375F", // magenta
          ]}
          rows={3}
          columns={3}
          points={[
            [0.0, 0.0],
            [0.5, 0.0],
            [1.0, 0.0],
            [0.0, 0.5],
            [0.5, 0.5],
            [1.0, 0.5],
            [0.0, 1.0],
            [0.5, 1.0],
            [1.0, 1.0],
          ]}
        />
      </Animated.View>
    </View>
  );
}
