import { useCallback, useRef } from "react";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { Gesture } from "react-native-gesture-handler";
import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const SEARCH_PULL_DISTANCE = 72;

/** Share the list's native scroll gesture; only a deliberate pull at its top opens search. */
export function usePantryPullSearch(enabled: boolean) {
  const router = useRouter();
  const navigation = useNavigation();
  const opening = useRef(false);
  const offset = useSharedValue(0);
  const dragStartOffset = useSharedValue(0);
  const startedAtTop = useSharedValue(false);
  const triggered = useSharedValue(false);
  const pullDistance = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opening.current = false;
    }, [])
  );

  const openSearch = useCallback(
    (visiblePull: number) => {
      if (!enabled || opening.current || !navigation.isFocused()) return;
      opening.current = true;
      router.push({ pathname: "/search", params: { pullOffset: String(visiblePull) } });
    },
    [enabled, navigation, router]
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    // Automatic iOS header insets make the resting offset negative.
    offset.value = event.contentOffset.y + event.contentInset.top;
  });

  const pull = Gesture.Pan()
    .activeOffsetY(16)
    .failOffsetX([-20, 20])
    .onBegin(() => {
      startedAtTop.value = enabled && offset.value <= 1;
      dragStartOffset.value = offset.value;
      triggered.value = false;
    })
    .onUpdate((event) => {
      if (!startedAtTop.value) return;
      pullDistance.value = Math.max(0, event.translationY);
      // Open during the pull, before releasing the list starts its rebound.
      if (!triggered.value && pullDistance.value >= SEARCH_PULL_DISTANCE) {
        triggered.value = true;
        // Native scrolling rubber-bands the content less than the finger moves.
        // Hand off that visible displacement so search starts at the same spot.
        scheduleOnRN(openSearch, Math.max(0, dragStartOffset.value - offset.value));
      }
    })
    .onFinalize(() => {
      startedAtTop.value = false;
      pullDistance.value = withTiming(0, { duration: 160 });
    });

  const pullStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, pullDistance.value / SEARCH_PULL_DISTANCE) * 0.45,
  }));

  return { gesture: Gesture.Simultaneous(Gesture.Native(), pull), onScroll, pullStyle };
}
