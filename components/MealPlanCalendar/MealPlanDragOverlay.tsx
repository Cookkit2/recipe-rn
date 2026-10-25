import { useRef, type ComponentRef } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { P } from "~/components/ui/typography";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";

export default function MealPlanDragOverlay() {
  const { draggedMeal, dragPosition } = useMealPlanCalendar();
  const root = useRef<ComponentRef<typeof View>>(null);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragPosition.x.value - originX.value - 70 },
      { translateY: dragPosition.y.value - originY.value - 30 },
    ],
  }));

  return (
    <View
      ref={root}
      pointerEvents="none"
      collapsable={false}
      style={{ position: "absolute", inset: 0 }}
      onLayout={() =>
        root.current?.measureInWindow((x, y) => {
          originX.value = x;
          originY.value = y;
        })
      }
    >
      {draggedMeal && (
        <Animated.View
          style={[{ width: 160 }, style]}
          className="bg-card border border-primary rounded-xl p-3 shadow-lg"
        >
          <P className="text-sm font-urbanist-semibold" numberOfLines={2}>
            {draggedMeal.recipe?.title ?? "Meal"}
          </P>
          <P className="text-xs text-muted-foreground mt-1">{draggedMeal.servings} servings</P>
        </Animated.View>
      )}
    </View>
  );
}
