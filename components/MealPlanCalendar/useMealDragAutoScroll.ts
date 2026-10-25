import { useCallback, useEffect, useRef, type ComponentRef } from "react";
import { ScrollView, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useMealPlanCalendar, type MealDropBounds } from "~/store/MealPlanCalendarContext";

/** Keep off-screen days and slots reachable while the drag owns the touch. */
export function useMealDragAutoScroll(horizontal = false) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const bounds = useRef<MealDropBounds | null>(null);
  const contentSize = useRef({ width: 0, height: 0 });
  const offset = useRef({ x: 0, y: 0 });
  const { dragState, dragPosition, moveMealDrag, registerDropViewport } = useMealPlanCalendar();
  const { x, y } = dragPosition;

  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((left, top, width, height) => {
      bounds.current = { x: left, y: top, width, height };
    });
  }, []);

  useEffect(() => {
    if (horizontal) return;
    return registerDropViewport(
      () =>
        new Promise((resolve) => {
          if (!ref.current) return resolve(null);
          const timeout = setTimeout(() => resolve(null), 100);
          ref.current.measureInWindow((left, top, width, height) => {
            clearTimeout(timeout);
            resolve(width > 0 && height > 0 ? { x: left, y: top, width, height } : null);
          });
        })
    );
  }, [horizontal, registerDropViewport]);

  useEffect(() => {
    if (!dragState.isDragging) return;
    onLayout();
    const timer = setInterval(() => {
      const viewport = bounds.current;
      if (
        !viewport ||
        x.value < viewport.x ||
        x.value > viewport.x + viewport.width ||
        y.value < viewport.y ||
        y.value > viewport.y + viewport.height
      )
        return;
      const pointer = horizontal ? x.value - viewport.x : y.value - viewport.y;
      const length = horizontal ? viewport.width : viewport.height;
      const content = horizontal ? contentSize.current.width : contentSize.current.height;
      const current = horizontal ? offset.current.x : offset.current.y;
      const direction = pointer < 44 ? -1 : pointer > length - 44 ? 1 : 0;
      const next = Math.max(0, Math.min(Math.max(0, content - length), current + direction * 18));
      if (next === current) return;
      offset.current = horizontal ? { ...offset.current, x: next } : { ...offset.current, y: next };
      ref.current?.scrollTo({ ...offset.current, animated: false });
    }, 60);
    return () => clearInterval(timer);
  }, [dragState.isDragging, horizontal, onLayout, x, y]);

  return {
    ref,
    onLayout,
    scrollEventThrottle: 16,
    onContentSizeChange: (width: number, height: number) => {
      contentSize.current = { width, height };
    },
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset;
      if (dragState.isDragging) moveMealDrag({ x: x.value, y: y.value }, true);
    },
  };
}
