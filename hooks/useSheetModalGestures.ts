import { Gesture } from "react-native-gesture-handler";
import {
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  ENABLE_HORIZONTAL_DRAG_CLOSE,
  DIRECTION_LOCK_ANGLE,
  HORIZONTAL_DRAG_THRESHOLD,
  DRAG_THRESHOLD,
} from "~/constants/sheet-modal";

export function useSheetModalGestures(goBack: () => void, handleHapticFeedback: () => void) {
  const translateY = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const translateX = useSharedValue(0);
  const initialGestureX = useSharedValue(0);
  const initialGestureY = useSharedValue(0);
  const isHorizontalGesture = useSharedValue(false);
  const isScrolling = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      "worklet";
      initialGestureX.value = event.x;
      initialGestureY.value = event.y;
      isHorizontalGesture.value = false;

      if (scrollOffset.value <= 0) {
        isDragging.value = true;
      }
    })
    .onUpdate((event) => {
      "worklet";
      const dx = event.translationX;
      const dy = event.translationY;

      if (ENABLE_HORIZONTAL_DRAG_CLOSE && !isHorizontalGesture.value && !isScrolling.value) {
        if (Math.abs(dx) > 10) {
          // Calculate angle only when needed and use simpler calculation
          const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
          if (angle < DIRECTION_LOCK_ANGLE) {
            isHorizontalGesture.value = true;
          }
        }
      }

      if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
        translateX.value = dx;
        translateY.value = dy;
      } else if (scrollOffset.value <= 0 && isDragging.value) {
        translateY.value = Math.max(0, dy);
      }
    })
    .onEnd((event) => {
      "worklet";
      isDragging.value = false;

      if (ENABLE_HORIZONTAL_DRAG_CLOSE && isHorizontalGesture.value) {
        const dx = event.translationX;
        const dy = event.translationY;
        const totalDistance = Math.sqrt(dx * dx + dy * dy);
        const shouldClose = totalDistance > HORIZONTAL_DRAG_THRESHOLD;

        if (shouldClose) {
          const exitX = dx * 2;
          const exitY = dy * 2;

          translateX.value = withTiming(exitX, { duration: 300 });
          translateY.value = withTiming(exitY, { duration: 300 });

          scheduleOnRN(handleHapticFeedback);
          scheduleOnRN(goBack);
        } else {
          translateX.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
        }
      } else if (scrollOffset.value <= 0) {
        const shouldClose = event.translationY > DRAG_THRESHOLD;

        if (shouldClose) {
          translateY.value = withTiming(event.translationY + 100, {
            duration: 300,
          });
          scheduleOnRN(handleHapticFeedback);
          scheduleOnRN(goBack);
        } else {
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
        }
      }
    })
    .onFinalize(() => {
      "worklet";
      isDragging.value = false;
      isHorizontalGesture.value = false;
    });

  const scrollGesture = Gesture.Native()
    .onBegin(() => {
      "worklet";
      isScrolling.value = true;
      if (!isDragging.value) {
        translateY.value = 0;
      }
    })
    .onEnd(() => {
      "worklet";
      isScrolling.value = false;
    });

  const composedGestures = Gesture.Simultaneous(panGesture, scrollGesture);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.y;
      // Only reset translateY if we're actually dragging down and starting to scroll
      if (!isDragging.value && translateY.value > 0) {
        translateY.value = 0;
      }
    },
  });

  return {
    composedGestures,
    scrollHandler,
    translateX,
    translateY,
  };
}
