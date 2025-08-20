import React, {
  useCallback,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import useColors from "~/hooks/useColor";

const DURATION_MS = 800;
const PARTICLE_COUNT = 40;
const DUST_PARTICLE_COUNT = 60;
const MAX_DISPLACEMENT = 200;
const SCREEN_SHAKE_INTENSITY = 8;

interface ParticleData {
  id: number;
  initialX: number;
  initialY: number;
  targetX: number;
  targetY: number;
  size: number;
  delay: number;
  color: string;
  type: "chunk" | "dust";
}

const EnhancedParticle: React.FC<{
  particle: ParticleData;
  animationProgress: SharedValue<number>;
}> = ({ particle, animationProgress }) => {
  const particleAnimatedStyle = useAnimatedStyle(() => {
    const progress = animationProgress.value;

    const translateX = interpolate(
      progress,
      [0, 1],
      [particle.initialX, particle.targetX]
    );

    const translateY = interpolate(
      progress,
      [0, 1],
      [
        particle.initialY,
        particle.targetY + (particle.type === "dust" ? 50 : 0),
      ]
    );

    const opacity =
      particle.type === "dust"
        ? interpolate(progress, [0, 0.3, 0.7, 1], [0, 0.8, 0.4, 0])
        : interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

    const scale =
      particle.type === "dust"
        ? interpolate(progress, [0, 0.3, 1], [0, 0.5, 0.1])
        : interpolate(progress, [0, 0.5, 1], [0, 1, 0.2]);

    const rotate = interpolate(progress, [0, 1], [0, 360]);

    return {
      position: "absolute" as const,
      left: 0,
      top: 0,
      width: particle.size,
      height: particle.size,
      backgroundColor: particle.color,
      borderRadius:
        particle.type === "dust" ? particle.size / 2 : particle.size / 4,
      transform: [
        { translateX },
        { translateY },
        { scale },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    };
  });

  return <Animated.View style={particleAnimatedStyle} />;
};

export default function ThanosSnapEffect({
  children,
  style,
  onSnapComplete,
  enableScreenShake = false,
  enableBlur = false,
}: PropsWithChildren<{
  style?: ViewStyle;
  onSnapComplete?: () => void;
  enableScreenShake?: boolean;
  enableBlur?: boolean;
}>) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [showParticles, setShowParticles] = useState(false);

  const animationProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const containerRef = useRef<View>(null);
  const colors = useColors();

  const generateParticles = (
    componentWidth: number,
    componentHeight: number
  ): ParticleData[] => {
    const particleArray: ParticleData[] = [];

    // Generate main chunk particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const initialX = Math.random() * componentWidth;
      const initialY = Math.random() * componentHeight;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * MAX_DISPLACEMENT + 50;

      const targetX = initialX + Math.cos(angle) * distance;
      const targetY = initialY + Math.sin(angle) * distance;

      particleArray.push({
        id: i,
        initialX,
        initialY,
        targetX,
        targetY,
        size: Math.random() * 12 + 6,
        delay: Math.random() * 200,
        color: colors.primary,
        type: "chunk",
      });
    }

    // Generate dust particles
    for (
      let i = PARTICLE_COUNT;
      i < PARTICLE_COUNT + DUST_PARTICLE_COUNT;
      i++
    ) {
      const initialX = Math.random() * componentWidth;
      const initialY = Math.random() * componentHeight;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (MAX_DISPLACEMENT * 1.5) + 100;

      const targetX = initialX + Math.cos(angle) * distance;
      const targetY = initialY + Math.sin(angle) * distance;

      particleArray.push({
        id: i,
        initialX,
        initialY,
        targetX,
        targetY,
        size: Math.random() * 4 + 2,
        delay: Math.random() * 400,
        color: colors.primaryForeground,
        type: "dust",
      });
    }

    return particleArray;
  };

  const createScreenShake = () => {
    if (!enableScreenShake) return;

    const shakeSequence = Array.from({ length: 8 }, (_, i) => {
      const intensity = SCREEN_SHAKE_INTENSITY * (1 - i * 0.1);
      return withTiming((Math.random() - 0.5) * intensity, {
        duration: 50,
        easing: Easing.out(Easing.quad),
      });
    });

    shakeX.value = withSequence(
      ...shakeSequence,
      withTiming(0, { duration: 100 })
    );
    shakeY.value = withSequence(
      ...shakeSequence.reverse(),
      withTiming(0, { duration: 100 })
    );
  };

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    setShowParticles(false);
    setParticles([]);
    animationProgress.value = 0;
    shakeX.value = 0;
    shakeY.value = 0;
  }, [animationProgress, shakeX, shakeY]);

  const resetCallback = useCallback(() => {
    setTimeout(() => {
      resetAnimation();
      onSnapComplete?.();
    }, 600);
  }, [onSnapComplete, resetAnimation]);

  const handlePress = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    createScreenShake();

    containerRef.current?.measure((x, y, width, height) => {
      const newParticles = generateParticles(width, height);
      setParticles(newParticles);
      setShowParticles(true);

      animationProgress.value = withTiming(
        1,
        {
          duration: DURATION_MS,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        },
        () => {
          runOnJS(resetCallback)();
        }
      );
    });
  };

  const containerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animationProgress.value,
      [0, 0.2, 0.4, 1],
      [1, 1.05, 1.15, 1.3]
    );

    const opacity = interpolate(
      animationProgress.value,
      [0, 0.6, 1],
      [1, 1, 0]
    );

    return {
      transform: [
        { translateX: shakeX.value },
        { translateY: shakeY.value },
        { scale },
      ],
      opacity,
    };
  });

  const blurAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.3, 0.7, 1],
      [0, 0.3, 0.7, 1]
    );

    return {
      opacity,
    };
  });

  const renderParticle = (particle: ParticleData) => (
    <EnhancedParticle
      key={particle.id}
      particle={particle}
      animationProgress={animationProgress}
    />
  );

  return (
    <View style={style}>
      <TouchableOpacity
        ref={containerRef}
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={isAnimating}
      >
        <Animated.View style={containerAnimatedStyle}>{children}</Animated.View>
      </TouchableOpacity>

      {/* Blur overlay */}
      {enableBlur && showParticles && (
        <Animated.View
          className="absolute inset-[-20] pointer-events-none"
          style={[blurAnimatedStyle]}
        >
          <BlurView intensity={20} style={styles.blurFill} />
        </Animated.View>
      )}

      {/* Particle overlay */}
      {showParticles && (
        <View className="absolute inset-0 pointer-events-none">
          {particles.map(renderParticle)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blurFill: { flex: 1 },
});
