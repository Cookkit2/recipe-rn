/**
 * AchievementConfetti Component
 *
 * Displays a confetti animation when achievements are unlocked.
 * Uses react-native-reanimated for smooth, performant animations.
 */

import * as React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withDelay,
  withSpring,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";

export interface AchievementConfettiProps {
  visible: boolean;
  duration?: number;
  onComplete?: () => void;
  colors?: string[];
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

// Generate confetti particles
function generateConfettiParticles(count: number, colors: string[]): ConfettiParticle[] {
  const palette = colors.length > 0 ? colors : ["#FFD700"];

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150, // Spread horizontally
    y: -300 - Math.random() * 200, // Start above screen
    rotation: Math.random() * 360,
    color: palette[Math.floor(Math.random() * palette.length)] ?? "#FFD700",
    size: 6 + Math.random() * 8, // Random size 6-14
    delay: Math.random() * 300, // Stagger animations
  }));
}

/**
 * Individual Confetti Particle Component
 */
function ConfettiParticleComponent({ particle, duration }: { particle: ConfettiParticle; duration: number }) {
  const animatedY = useSharedValue(particle.y);
  const animatedX = useSharedValue(particle.x);
  const animatedRotation = useSharedValue(particle.rotation);
  const animatedOpacity = useSharedValue(1);
  const animatedScale = useSharedValue(0);

  // Start animation when component mounts
  React.useEffect(() => {
    // Fall animation
    animatedY.value = withDelay(
      particle.delay,
      withTiming(600, { duration: duration * (0.8 + Math.random() * 0.4), easing: Easing.out(Easing.quad) })
    );

    // Wiggle effect
    animatedX.value = withDelay(
      particle.delay,
      withSequence(
        withTiming(particle.x + 50, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(particle.x - 50, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        withTiming(particle.x, { duration: duration / 4, easing: Easing.inOut(Easing.sin) })
      )
    );

    // Rotation
    animatedRotation.value = withDelay(
      particle.delay,
      withTiming(particle.rotation + 720, { duration, easing: Easing.out(Easing.quad) })
    );

    // Fade in and scale up at start
    animatedOpacity.value = withDelay(particle.delay, withTiming(1, { duration: 100 }));
    animatedScale.value = withDelay(particle.delay, withSpring(1, { damping: 15, stiffness: 150 }));

    // Fade out at end
    animatedOpacity.value = withDelay(
      particle.delay + duration - 200,
      withTiming(0, { duration: 200 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: animatedX.value },
      { translateY: animatedY.value },
      { rotateZ: `${animatedRotation.value}deg` },
      { scale: animatedScale.value },
    ] as const,
    opacity: animatedOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          backgroundColor: particle.color,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 3,
        },
      ]}
    />
  );
}

/**
 * AchievementConfetti Component
 *
 * Displays a burst of confetti when achievements unlock.
 * Automatically triggers animation when `visible` prop changes to true.
 */
export default function AchievementConfetti({
  visible,
  duration = 2000,
  onComplete,
  colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
}: AchievementConfettiProps) {
  const [particles, setParticles] = React.useState<ConfettiParticle[]>([]);
  const animationKey = React.useRef(0);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset and trigger animation when visible changes
  React.useEffect(() => {
    if (visible) {
      // Increment key to force re-render with new particles
      animationKey.current += 1;

      // Generate new particles for this animation cycle
      const newParticles = generateConfettiParticles(50, colors);
      setParticles(newParticles);

      // Call on complete after animation finishes
      if (onComplete) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          onComplete();
        }, duration + 300);
      }

      // Clear particles after animation
      const clearTimeoutId = setTimeout(() => {
        setParticles([]);
      }, duration + 400);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        clearTimeout(clearTimeoutId);
      };
    } else {
      // Clear particles immediately when not visible
      setParticles([]);
    }
  }, [visible, duration, colors, onComplete]);

  if (!visible || particles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticleComponent key={`${animationKey.current}-${particle.id}`} particle={particle} duration={duration} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  particle: {
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
