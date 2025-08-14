import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const useOnPressScale = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const triggerHapticFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressIn = () => {
    "worklet";
    runOnJS(triggerHapticFeedback)();
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    "worklet";
    scale.value = withSequence(
      withSpring(1.05, {
        damping: 15,
        stiffness: 300,
      }),
      withSpring(1, {
        damping: 15,
        stiffness: 300,
      })
    );
  };

  return { animatedStyle, handlePressIn, handlePressOut };
};

export default useOnPressScale;
