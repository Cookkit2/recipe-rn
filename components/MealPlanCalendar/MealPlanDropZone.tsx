import { useEffect, useId, useRef, type ComponentRef, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import {
  useMealPlanCalendar,
  type MealDropBounds,
  type MealDropHandler,
} from "~/store/MealPlanCalendarContext";
import type { MealSlot } from "~/types/MealPlan";

export default function MealPlanDropZone({
  date,
  mealSlot,
  onDrop,
  children,
  className,
  style,
}: {
  date: Date;
  mealSlot?: MealSlot;
  onDrop?: MealDropHandler;
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useId();
  const view = useRef<ComponentRef<typeof View>>(null);
  const { registerDropTarget, hoveredDropTarget } = useMealPlanCalendar();
  const timestamp = date.getTime();

  useEffect(() => {
    if (!onDrop) return;
    return registerDropTarget(id, {
      date: new Date(timestamp),
      mealSlot,
      onDrop,
      measure: () =>
        new Promise<MealDropBounds | null>((resolve) => {
          if (!view.current) return resolve(null);
          const timeout = setTimeout(() => resolve(null), 100);
          view.current.measureInWindow((x, y, width, height) => {
            clearTimeout(timeout);
            resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
          });
        }),
    });
  }, [id, timestamp, mealSlot, onDrop, registerDropTarget]);

  return (
    <View
      ref={view}
      collapsable={false}
      style={style}
      className={`${className ?? ""} ${hoveredDropTarget === id ? "bg-primary/20" : ""}`}
    >
      {children}
    </View>
  );
}
