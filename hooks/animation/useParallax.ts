import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useDeviceMotion } from "../useDeviceMotion";
import { useEffect } from "react";

interface ParallaxConfig {
  intensity?: number; // Multiplier for the parallax effect (default: 1)
  maxOffset?: number; // Maximum offset in pixels (default: 20)
  springConfig?: {
    damping?: number;
    stiffness?: number;
  };
}

export const useParallax = (config: ParallaxConfig = {}) => {
  const {
    intensity = 1,
    maxOffset = 20,
    springConfig = { damping: 20, stiffness: 100 },
  } = config;

  const { tiltAngles } = useDeviceMotion();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Convert tilt angles to parallax offset
    // Roll controls X-axis movement (left/right tilt)
    // Pitch controls Y-axis movement (forward/backward tilt)

    // Normalize the angles and apply intensity
    const normalizedRoll =
      Math.max(-1, Math.min(1, tiltAngles.roll / 45)) * intensity;
    const normalizedPitch =
      Math.max(-1, Math.min(1, tiltAngles.pitch / 45)) * intensity;

    // Calculate the offset with max limits
    const targetX = normalizedRoll * maxOffset;
    const targetY = -normalizedPitch * maxOffset; // Negative for intuitive movement

    // Animate to the new position
    translateX.value = withSpring(targetX, springConfig);
    translateY.value = withSpring(targetY, springConfig);
  }, [
    tiltAngles.roll,
    tiltAngles.pitch,
    intensity,
    maxOffset,
    springConfig,
    translateX,
    translateY,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return { animatedStyle };
};
