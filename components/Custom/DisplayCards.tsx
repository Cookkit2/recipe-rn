import React, { useEffect, useMemo } from "react";
import { View, Dimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { dummyPantryItems } from "~/data/dummy/dummy-data";
import OutlinedImage from "../ui/outlined-image";
import RotationCard from "../Onboarding/RotationCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const innerImages = dummyPantryItems.slice(0, 4).map(({ image_url }, i) => ({
  id: `inner-${i.toString()}`,
  url: image_url,
}));

const outerImages = dummyPantryItems.slice(5, 10).map(({ image_url }, i) => ({
  id: `outer-${i.toString()}`,
  url: image_url,
}));

const size = SCREEN_WIDTH * 0.9;

const center = size / 2;

const centerRingRadius = size * 0.15;
const ring1Radius = size * 0.3;
const ring2Radius = size * 0.45;

const outerRadius = size * 0.48;
const avatarSizeOuter = size * 0.16;

const innerRadius = size * 0.27;
const avatarSizeInner = size * 0.12;

export default function DisplayCards() {
  const rotate = useSharedValue(0);
  const pulse = useSharedValue(1);
  const rotationDegrees = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withTiming(1, { duration: 48000, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1.12, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [rotate, pulse, rotationDegrees]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.35 + (pulse.value - 1) * 1.2,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (pulse.value - 1) * 0.7 }],
    opacity: 0.25 + (pulse.value - 1),
  }));

  const orbitStyle = useAnimatedStyle(() => {
    const degrees = rotate.value * 360;
    rotationDegrees.value = degrees;
    return {
      transform: [
        {
          rotate: `${degrees}deg`,
        },
      ],
    };
  });

  // Precompute angle placements for inner avatars with varied spacing
  const innerPlacements = useMemo(() => {
    const n = innerImages.length || 1;
    return innerImages.map((img, idx) => {
      // Create varied spacing instead of even distribution
      const baseAngle = (idx / n) * Math.PI * 2;
      const randomOffset = Math.sin((idx + 1) * 17.3) * 0.5 * (Math.PI / 6); // Random offset up to 30 degrees
      const angle = baseAngle + randomOffset;
      return { ...img, angle };
    });
  }, []);

  // Precompute angle placements for outer avatars with varied spacing
  const placements = useMemo(() => {
    const n = outerImages.length || 1;
    return outerImages.map((img, idx) => {
      // Create varied spacing instead of even distribution
      const baseAngle = (idx / n) * Math.PI * 2;
      const randomOffset = Math.sin((idx + 1) * 23.7) * 0.7 * (Math.PI / 4); // Random offset up to 45 degrees
      const angle = baseAngle + randomOffset;
      return { ...img, angle };
    });
  }, []);

  return (
    <View
      className="justify-center self-center"
      style={[{ width: size, height: size }]}
    >
      {/* Center Ring */}
      <View
        className="absolute inset-0 bg-primary rounded-full"
        style={[
          {
            width: centerRingRadius * 2,
            height: centerRingRadius * 2,
            left: center - centerRingRadius,
            top: center - centerRingRadius,
          },
        ]}
      />

      {/* Second Outer Rings */}
      <Animated.View
        className="absolute rounded-full bg-primary/60"
        style={[
          ring1Style,
          {
            width: ring1Radius * 2,
            height: ring1Radius * 2,
            left: center - ring1Radius,
            top: center - ring1Radius,
          },
        ]}
      />

      {/* Outest Rings */}
      <Animated.View
        className="absolute rounded-full bg-primary/20"
        style={[
          ring2Style,
          {
            width: ring2Radius * 2,
            height: ring2Radius * 2,
            left: center - ring2Radius,
            top: center - ring2Radius,
          },
        ]}
      />

      {/* Rotating Avatars */}
      <Animated.View
        className="absolute inset-0"
        style={[orbitStyle, { width: size, height: size }]}
      >
        {placements.map((p, i) => {
          const x =
            center + outerRadius * Math.cos(p.angle) - avatarSizeOuter / 2;
          const y =
            center + outerRadius * Math.sin(p.angle) - avatarSizeOuter / 2;
          return (
            <View
              key={p.id}
              className="absolute rounded-full shadow-sm"
              style={[
                {
                  width: avatarSizeOuter,
                  height: avatarSizeOuter,
                  left: x,
                  top: y,
                },
              ]}
            >
              <RotationCard
                index={i}
                total={placements.length}
                counterRotationValue={rotationDegrees}
              >
                <OutlinedImage source={p.url} size={72} />
              </RotationCard>
            </View>
          );
        })}
      </Animated.View>

      <Animated.View
        className="absolute inset-0"
        style={[orbitStyle, { width: size, height: size }]}
      >
        {innerPlacements.map((p, i) => {
          const x =
            center + innerRadius * Math.cos(p.angle) - avatarSizeInner / 2;
          const y =
            center + innerRadius * Math.sin(p.angle) - avatarSizeInner / 2;
          return (
            <View
              key={p.id}
              className="absolute rounded-full shadow-sm"
              style={[
                {
                  width: avatarSizeOuter,
                  height: avatarSizeOuter,
                  left: x,
                  top: y,
                },
              ]}
            >
              <RotationCard
                index={i}
                total={innerPlacements.length}
                counterRotationValue={rotationDegrees}
              >
                <OutlinedImage source={p.url} size={64} />
              </RotationCard>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}
