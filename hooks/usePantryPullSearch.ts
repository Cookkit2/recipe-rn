import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Gesture } from "react-native-gesture-handler";
import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const SEARCH_PULL_DISTANCE = 72;
type SearchPhase = "closed" | "pulling" | "open" | "closing" | "canceling";

/** Keep the original scroll gesture alive until release; search shares its live displacement. */
export function usePantryPullSearch(enabled: boolean, restingTop: number) {
  const [phase, setPhase] = useState<SearchPhase>("closed");
  const focused = useSharedValue(false);
  const offset = useSharedValue(restingTop);
  const dragStartOffset = useSharedValue(restingTop);
  const startedAtTop = useSharedValue(false);
  const previewShown = useSharedValue(false);
  const released = useSharedValue(false);
  const pullDistance = useSharedValue(0);
  const searchOffset = useSharedValue(0);
  const progress = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      focused.value = true;
      return () => {
        focused.value = false;
      };
    }, [focused])
  );

  const finishDismiss = useCallback(() => {
    previewShown.value = false;
    setPhase("closed");
  }, [previewShown]);

  const dismiss = useCallback(() => {
    startedAtTop.value = false;
    if (!previewShown.value) return;
    setPhase((current) => (current === "open" || current === "closing" ? "closing" : "canceling"));
    searchOffset.value = withSpring(0, { damping: 24, stiffness: 260, mass: 0.8 });
    progress.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) scheduleOnRN(finishDismiss);
    });
  }, [previewShown, startedAtTop, searchOffset, progress, finishDismiss]);

  const open = useCallback(() => {
    if (previewShown.value) return;
    previewShown.value = true;
    searchOffset.value = 0;
    setPhase("pulling");
    progress.value = withTiming(1, { duration: 180 }, (finished) => {
      if (finished) scheduleOnRN(setPhase, "open");
    });
  }, [previewShown, searchOffset, progress]);

  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = event.contentOffset.y;
    if (startedAtTop.value) {
      // Read every native scroll update, including updates delivered after the
      // pan crossed its threshold. A route param captured only the first frame.
      searchOffset.value = Math.max(0, dragStartOffset.value - offset.value);
    }
  });

  const pull = Gesture.Pan()
    .activeOffsetY(16)
    .failOffsetX([-20, 20])
    .onBegin(() => {
      startedAtTop.value =
        enabled && focused.value && !previewShown.value && offset.value <= restingTop + 1;
      dragStartOffset.value = offset.value;
      released.value = false;
      pullDistance.value = 0;
    })
    .onUpdate((event) => {
      if (!startedAtTop.value) return;
      pullDistance.value = Math.max(0, event.translationY);
      progress.value = Math.min(1, pullDistance.value / SEARCH_PULL_DISTANCE);
      if (!previewShown.value && pullDistance.value > 16) {
        previewShown.value = true;
        scheduleOnRN(setPhase, "pulling");
      }
    })
    .onEnd((_event, success) => {
      released.value = true;
      if (!success) {
        if (startedAtTop.value) scheduleOnRN(dismiss);
        startedAtTop.value = false;
        return;
      }
      if (!startedAtTop.value) return;
      startedAtTop.value = false;
      if (pullDistance.value >= SEARCH_PULL_DISTANCE) {
        searchOffset.value = withSpring(0, { damping: 24, stiffness: 260, mass: 0.8 });
        progress.value = withTiming(1, { duration: 100 });
        // Only a completed finger release is allowed to mount/focus native search.
        scheduleOnRN(setPhase, "open");
      } else {
        scheduleOnRN(dismiss);
      }
    })
    .onFinalize(() => {
      if (!released.value && startedAtTop.value && previewShown.value) scheduleOnRN(dismiss);
      startedAtTop.value = false;
    });

  const homeStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  return {
    gesture: Gesture.Simultaneous(Gesture.Native(), pull),
    onScroll,
    homeStyle,
    searchOffset,
    progress,
    phase,
    focusEnabled: phase === "open",
    dismiss,
    open,
  };
}
