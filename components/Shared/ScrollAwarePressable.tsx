import { useRef, type ComponentProps } from "react";
import { Pressable, type GestureResponderEvent } from "react-native";

const TAP_SLOP = 10;

/** Reject drags even when a native-hosted scroll view doesn't cancel RN's responder. */
export default function ScrollAwarePressable({
  onPress,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  ...props
}: ComponentProps<typeof Pressable>) {
  const touch = useRef<{ x: number; y: number; cancelled: boolean } | null>(null);

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
        touch.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
          cancelled: false,
        };
        onTouchStart?.(event);
      }}
      onTouchMove={(event) => {
        trackMovement(event);
        onTouchMove?.(event);
      }}
      onTouchEnd={(event) => {
        trackMovement(event);
        // Keep cancellation until the next touch: onPress may arrive after touch-end.
        onTouchEnd?.(event);
      }}
      onTouchCancel={(event) => {
        if (touch.current) touch.current.cancelled = true;
        onTouchCancel?.(event);
      }}
      onPress={(event) => {
        // Accessibility/keyboard activation has no touch identifier and must stay usable.
        if (typeof event.nativeEvent.identifier === "number") {
          trackMovement(event);
          if (touch.current?.cancelled) {
            event.preventDefault();
            return;
          }
        }
        onPress?.(event);
      }}
    />
  );
}
