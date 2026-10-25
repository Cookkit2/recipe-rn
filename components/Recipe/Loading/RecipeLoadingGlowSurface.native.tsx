import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import useDeviceCornerRadius from "~/hooks/useDeviceCornerRadius";
import type { RecipeLoadingGlowSurfaceProps } from "./RecipeLoadingGlowSurface";
import {
  RECIPE_GLOW_COLORS,
  RECIPE_GLOW_ENTER_MS,
  RECIPE_GLOW_EXIT_MS,
  RECIPE_GLOW_FRAME_MS,
  RECIPE_GLOW_SHADER,
  recipeGlowModes,
} from "./recipe-loading-glow";

const effect = Skia.RuntimeEffect.Make(RECIPE_GLOW_SHADER);

export default function RecipeLoadingGlowSurface({
  active,
  reducedMotion,
}: RecipeLoadingGlowSurfaceProps) {
  const radius = useDeviceCornerRadius();
  const [seed] = useState(() => Math.floor(Math.random() * 4294967296));
  const size = useSharedValue({ width: 0, height: 0 });
  const elapsed = useSharedValue(0);
  const lastPaint = useSharedValue(0);
  const clock = useSharedValue(0);
  const entrance = useSharedValue(0);
  const frames = useFrameCallback(({ timestamp, timeSincePreviousFrame }) => {
    // Accumulate real elapsed time even when skipping high-refresh display frames.
    elapsed.value += timeSincePreviousFrame ?? 0;
    if (timestamp - lastPaint.value >= RECIPE_GLOW_FRAME_MS - 1) {
      lastPaint.value = timestamp;
      clock.value = elapsed.value;
    }
  }, false);
  useEffect(() => {
    frames.setActive(!reducedMotion);
  }, [frames, reducedMotion]);
  useEffect(() => {
    entrance.value = withTiming(1, {
      duration: reducedMotion ? 0 : RECIPE_GLOW_ENTER_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [entrance, reducedMotion]);
  const visibility = useDerivedValue(() =>
    withTiming(active ? 1 : 0, {
      duration: reducedMotion ? 0 : active ? RECIPE_GLOW_ENTER_MS : RECIPE_GLOW_EXIT_MS,
      easing: Easing.inOut(Easing.cubic),
    })
  );
  const animatedStyle = useAnimatedStyle(() => ({ opacity: entrance.value * visibility.value }));
  const uniforms = useDerivedValue(() => {
    const modes = recipeGlowModes(clock.value, seed);
    return {
      uSize: [size.value.width, size.value.height],
      uRadius: Math.min(Math.max(0, radius), size.value.width / 2, size.value.height / 2),
      uIntensity: 0.39,
      uSpread: 0.5 * (0.7 + 0.3 * entrance.value * visibility.value),
      uLayering: 0.24,
      uVariation: 1,
      uHighlight: 0.7,
      uCos: modes.cosine,
      uSin: modes.sine,
      uBase: RECIPE_GLOW_COLORS.base,
      uPeach: RECIPE_GLOW_COLORS.highlight,
      uAmber: RECIPE_GLOW_COLORS.middle,
      uEmber: RECIPE_GLOW_COLORS.deep,
    };
  });
  if (!effect) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill} onSize={size} colorSpace="srgb">
        <Fill>
          <Shader source={effect} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </Animated.View>
  );
}
