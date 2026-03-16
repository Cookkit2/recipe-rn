import Animated, {
  type SharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";

// Starburst component for celebration animation
function StarburstParticle({
  index,
  total,
  triggerAnimation,
}: {
  index: number;
  total: number;
  triggerAnimation: SharedValue<number>;
}) {
  const angle = (index / total) * 2 * Math.PI;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, {
        duration: 400,
        easing: CURVES["expressive.default.effects"].easing,
      })
    );

    const translateX = withTiming(triggerAnimation.value * Math.cos(angle) * 30, {
      duration: 500,
      easing: CURVES["expressive.default.effects"].easing,
    });

    const translateY = withTiming(triggerAnimation.value * Math.sin(angle) * 30, {
      duration: 500,
      easing: CURVES["expressive.default.effects"].easing,
    });

    return {
      transform: [
        { translateX },
        { translateY },
        { scale: triggerAnimation.value > 0 ? scale : 0 },
      ],
      opacity: triggerAnimation.value > 0 ? 1 : 0,
    };
  });

  const particleStyle = {
    position: "absolute" as const,
    width: 6,
    height: 6,
    backgroundColor: "#FFD700", // Gold color for stars
    borderRadius: 3,
  };

  return <Animated.View style={[particleStyle, animatedStyle]} />;
}

function Starburst({
  triggerAnimation,
  progress,
  style,
}: {
  triggerAnimation: SharedValue<number>;
  progress: SharedValue<number>;
  style?: object;
}) {
  const particleCount = 8;

  const containerStyle = useAnimatedStyle(() => {
    const progressPercentage = Math.max(1, Math.min(100, progress.value));
    return {
      position: "absolute" as const,
      left: `${progressPercentage}%`,
      top: "50%" as const,
      marginTop: -3,
      marginLeft: -3, // Center the starburst on the indicator end
    };
  });

  return (
    <Animated.View style={[containerStyle, style]}>
      {Array.from({ length: particleCount }).map((_, index) => (
        <StarburstParticle
          key={index}
          index={index}
          total={particleCount}
          triggerAnimation={triggerAnimation}
        />
      ))}
    </Animated.View>
  );
}

export default Starburst;
