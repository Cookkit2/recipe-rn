import { useRef, type ComponentProps } from "react";
import { Pressable, type GestureResponderEvent } from "react-native";

const TAP_SLOP = 10;

/** Reject drags even when a native-hosted scroll view doesn't cancel RN's responder. */
export default function ScrollAwarePressable({
  onPress,
  onPressIn,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  ...props
}: ComponentProps<typeof Pressable>) {
  const touch = useRef<{ x: number; y: number; cancelled: boolean; ended: boolean } | null>(null);

  const startTouch = ({ nativeEvent }: GestureResponderEvent) => {
    touch.current = {
      x: nativeEvent.pageX,
      y: nativeEvent.pageY,
      cancelled: false,
      ended: false,
    };
  };

  const trackMovement = ({ nativeEvent }: GestureResponderEvent) => {
    const start = touch.current;
    if (start && Math.hypot(nativeEvent.pageX - start.x, nativeEvent.pageY - start.y) > TAP_SLOP) {
      start.cancelled = true;
    }
  };

  return (
    <Pressable
      {...props}
      onTouchStart={(event) => {
        startTouch(event);
        onTouchStart?.(event);
      }}
      onPressIn={(event) => {
        // Recover a fresh responder cycle if native navigation skipped touch-start.
        // Re-entry during an active drag, and delayed activation on release, must
        // keep that gesture's cancellation instead of turning the drag into a tap.
        if ((!touch.current || touch.current.ended) && event.nativeEvent.touches?.length !== 0) {
          startTouch(event);
        }
        onPressIn?.(event);
      }}
      onTouchMove={(event) => {
        trackMovement(event);
        onTouchMove?.(event);
      }}
      onTouchEnd={(event) => {
        trackMovement(event);
        if (touch.current) touch.current.ended = true;
        // Keep cancellation until onPress consumes this gesture, even after touch-end.
        onTouchEnd?.(event);
      }}
      onTouchCancel={(event) => {
        if (touch.current) {
          touch.current.cancelled = true;
          touch.current.ended = true;
        }
        onTouchCancel?.(event);
      }}
      onPress={(event) => {
        trackMovement(event);
        const cancelled = touch.current?.cancelled;
        // A navigation callback can trigger late native touch cancellation. It
        // belongs to this completed press, not the next tap after returning.
        touch.current = null;
        // Accessibility/keyboard activation has no touch identifier and must stay usable.
        if (typeof event.nativeEvent.identifier === "number") {
          if (cancelled) {
            event.preventDefault();
            return;
          }
        }
        onPress?.(event);
      }}
    />
  );
}
