import { useCallback } from "react";
import useOnPressRounded from "./useOnPressRounded";
import useOnPressScale from "./useOnPressScale";

/**
 * Combines scale and border-radius animations for button press interactions.
 *
 * Contract
 * - Input: enableAnimation (optional flag to disable animations), borderRadius (optional starting border radius)
 * - Output: animatedStyle (scale), roundedStyle (border radius), onPressIn/onPressOut handlers
 * - Behavior: When enabled, press in triggers scale down and border radius increase,
 *   press out triggers scale bounce (overshoot and return) and border radius return to original.
 *
 * @param enableAnimation - If false, onPressIn/onPressOut are undefined (no animations applied)
 * @param borderRadius - Starting border radius value that gets doubled on press
 */
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
