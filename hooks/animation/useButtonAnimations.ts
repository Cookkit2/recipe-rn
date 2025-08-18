import { useCallback } from "react";
import useOnPressRounded from "./useOnPressRounded";
import useOnPressScale from "./useOnPressScale";

const useButtonAnimation = (enableAnimation = true, borderRadius = 12) => {
  const {
    animatedStyle: scaleStyle,
    handlePressIn: onScaleIn,
    handlePressOut: onScaleOut,
  } = useOnPressScale();

  const {
    animatedStyle: roundedStyle,
    handlePressIn: onRoundedIn,
    handlePressOut: onRoundedOut,
  } = useOnPressRounded(borderRadius);

  const onPressIn = useCallback(() => {
    onScaleIn();
    onRoundedIn();
  }, [onScaleIn, onRoundedIn]);

  const onPressOut = useCallback(() => {
    onScaleOut();
    onRoundedOut();
  }, [onScaleOut, onRoundedOut]);

  return {
    animatedStyle: scaleStyle,
    roundedStyle,
    onPressIn: enableAnimation ? onPressIn : undefined,
    onPressOut: enableAnimation ? onPressOut : undefined,
  };
};

export default useButtonAnimation;
