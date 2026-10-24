import { useMemo, useRef } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { P } from "~/components/ui/typography";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { useSelectionHaptic } from "~/hooks/useSelectionHaptic";
import type { CalendarMealPlan } from "~/types/MealPlan";

export default function MealPlanDragItem({
  mealPlan,
  onPress,
}: {
  mealPlan: CalendarMealPlan;
  onPress: (meal: CalendarMealPlan) => void;
}) {
  const { startMealDrag, moveMealDrag, finishMealDrag, cancelMealDrag, draggedMeal } =
    useMealPlanCalendar();
  const suppressPress = useRef(false);
  const haptic = useSelectionHaptic();
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(300)
        .runOnJS(true)
        .onStart((event) => {
          suppressPress.current = true;
          haptic();
          startMealDrag(mealPlan, { x: event.absoluteX, y: event.absoluteY });
        })
        .onUpdate((event) => moveMealDrag({ x: event.absoluteX, y: event.absoluteY }))
        .onEnd((event) => {
          void finishMealDrag({ x: event.absoluteX, y: event.absoluteY });
        })
        .onFinalize((_, success) => {
          if (!success) cancelMealDrag();
        }),
    [mealPlan, startMealDrag, moveMealDrag, finishMealDrag, cancelMealDrag, haptic]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ opacity: draggedMeal?.id === mealPlan.id ? 0.35 : 1 }}>
        <Pressable
          onPressIn={() => {
            suppressPress.current = false;
          }}
          onPress={() => {
            if (!suppressPress.current) onPress(mealPlan);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${mealPlan.recipe?.title ?? "meal"}`}
          accessibilityHint="Double tap to edit. Long press and drag to move this meal."
          className="bg-primary/10 rounded-lg p-2"
        >
          <View className="flex-row items-center gap-1">
            <P className="text-xs text-muted-foreground capitalize flex-1">{mealPlan.mealSlot}</P>
            <P className="text-muted-foreground text-xs" accessibilityElementsHidden>
              ⠿
            </P>
          </View>
          <P className="text-sm font-urbanist-semibold mt-1" numberOfLines={2}>
            {mealPlan.recipe?.title ?? "Recipe"}
          </P>
          <P className="text-xs text-muted-foreground mt-1">{mealPlan.servings} servings</P>
        </Pressable>
      </View>
    </GestureDetector>
  );
}
