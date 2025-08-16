import {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
  } from "react-native-reanimated";

  import { CURVES } from "~/constants/curves";
  
  const useOnPressRounded = () => {
    const borderRadius = useSharedValue(24);
  
    const animatedStyle = useAnimatedStyle(() => ({
        borderRadius: borderRadius.value,
    }));
  

    const handlePressIn = () => {
      "worklet";
      borderRadius.value = withTiming(9999, CURVES["expressive.fast.effects"]);
  
    };
  
    const handlePressOut = () => {
      "worklet";
      borderRadius.value = withSequence(
        withTiming(24, CURVES["expressive.fast.effects"]),
        withTiming(9999, CURVES["expressive.fast.effects"])
      );    
    };
  
    return { animatedStyle, handlePressIn, handlePressOut };
  };
  
  export default useOnPressRounded;
  