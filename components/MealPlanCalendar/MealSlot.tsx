import { useState } from "react";
import { Pressable, View } from "react-native";
import { P } from "~/components/ui/typography";
import { useMealPlanCalendar, type MealDropHandler } from "~/store/MealPlanCalendarContext";
import type { CalendarMealPlan, MealSlot as MealSlotType } from "~/types/MealPlan";
import MealPlanEntryEditor from "./MealPlanEntryEditor";
import MealPlanDragItem from "./MealPlanDragItem";
import MealPlanDropZone from "./MealPlanDropZone";

export default function MealSlot({
  date,
  mealSlot,
  mealPlans = [],
  onPress,
  onDrop,
}: {
  date: Date;
  mealSlot: MealSlotType;
  mealPlans?: CalendarMealPlan[];
  onPress?: (date: Date, mealSlot: MealSlotType) => void;
  onDrop?: MealDropHandler;
}) {
  const [editing, setEditing] = useState<CalendarMealPlan | null>(null);
  const { dragState } = useMealPlanCalendar();

  return (
    <MealPlanDropZone date={date} mealSlot={mealSlot} onDrop={onDrop}>
      <View className="min-h-20 border-b border-border px-2 py-2 justify-center">
        {mealPlans.length > 0 ? (
          <View className="gap-2">
            {mealPlans.map((plan) => (
              <MealPlanDragItem key={plan.id} mealPlan={plan} onPress={setEditing} />
            ))}
            <Pressable
              disabled={dragState.isDragging}
              onPress={() => onPress?.(date, mealSlot)}
              accessibilityRole="button"
              accessibilityLabel={`Add another dish to ${mealSlot}`}
              className="py-1"
            >
              <P className="text-xs text-muted-foreground">+ Add dish</P>
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={dragState.isDragging}
            onPress={() => onPress?.(date, mealSlot)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${mealSlot} on ${date.toLocaleDateString()}`}
            className="min-h-16 items-center justify-center"
          >
            <P className="text-xs text-muted-foreground capitalize">+ {mealSlot}</P>
          </Pressable>
        )}
      </View>
      {editing && <MealPlanEntryEditor meal={editing} onClose={() => setEditing(null)} />}
    </MealPlanDropZone>
  );
}
