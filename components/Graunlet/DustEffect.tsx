// DustEffect.tsx

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, Rect, Group, Blur } from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  interpolate,
} from "react-native-reanimated";

// Assuming UIState is 'visible' | 'hidden'
import type { UIState } from "./Graunlet";
import { type DustParticle, createDustParticles } from "./Utils"; // Assume utils.ts holds the helpers

// Define props for a single animated layer
interface SingleDustLayerProps {
  progress: Animated.SharedValue<number>;
  particles: DustParticle[];
  initialX: number;
  initialY: number;
  initialRotate: number;
  zIndex: number;
}

// A memoized component for a single canvas layer to prevent re-renders
const SingleDustLayer = React.memo(
  ({
    progress,
    particles,
    initialX,
    initialY,
    initialRotate,
    zIndex,
  }: SingleDustLayerProps) => {
    const animatedStyle = useAnimatedStyle(() => {
      // Interpolate values based on the progress (0 to 1)
      const opacity = progress.value;
      const x = interpolate(progress.value, [0, 1], [initialX, 0]);
      const y = interpolate(progress.value, [0, 1], [initialY, 0]);
      const rotate = interpolate(progress.value, [0, 1], [initialRotate, 0]);
      const blur = interpolate(progress.value, [0, 1], [2, 0]); // Animate blur from 2px to 0

      return {
        opacity,
        transform: [
          { translateX: x },
          { translateY: y },
          { rotate: `${rotate}deg` },
        ],
      };
    });

    return (
      <Animated.View
        style={[StyleSheet.absoluteFill, animatedStyle, { zIndex }]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {/* We wrap particles in a Group to apply the blur to all at once */}
          <Group>
            {particles.map((p, i) => (
              <Rect
                key={i}
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                color="rgba(255, 255, 255, 0.7)" // Example dust color
              />
            ))}
            <Blur blur={2} />{" "}
            {/* The blur amount can be animated too if needed */}
          </Group>
        </Canvas>
      </Animated.View>
    );
  }
);

// Main component props
interface DustEffectProps {
  state: UIState;
  canvasCount?: number;
  particleCount?: number;
  width?: number;
  height?: number;
  zIndex?: number;
}

export const DustEffect = ({
  state,
  canvasCount = 10,
  particleCount = 500,
  width = 300,
  height = 300,
  zIndex = 10,
}: DustEffectProps) => {
  // Shared value to drive the animation: 0 = hidden, 1 = visible
  const progress = useSharedValue(0);

  // Animate the progress value when the state prop changes
  useEffect(() => {
    progress.value = withTiming(state === "visible" ? 1 : 0, {
      duration: 1000,
    });
  }, [state, progress]);

  // useMemo ensures that random values and particle data are generated only once
  const dustLayers = useMemo(() => {
    const allParticles = createDustParticles(
      canvasCount,
      particleCount,
      width,
      height
    );

    return Array.from({ length: canvasCount }).map((_, index) => ({
      key: index,
      particles: allParticles[index] || [],
      initialX: 75,
      initialY: -75,
      initialRotate: Math.floor(Math.random() * 40) - 20, // Random rotation from -20 to 20
    }));
  }, [canvasCount, particleCount, width, height]);

  return (
    <View style={{ width, height }}>
      {dustLayers.map((layer) => (
        <SingleDustLayer
          key={layer.key}
          progress={progress}
          particles={layer.particles}
          initialX={layer.initialX}
          initialY={layer.initialY}
          initialRotate={layer.initialRotate}
          zIndex={zIndex - 1}
        />
      ))}
    </View>
  );
};
