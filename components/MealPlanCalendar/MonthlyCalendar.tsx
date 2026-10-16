import { View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { P } from "~/components/ui/typography";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { useCalendarMealPlans } from "~/hooks/queries/useCalendarMealPlans";
import { groupMealsByDay, localDateKey, monthGridDates } from "~/utils/meal-plan-calendar";
import type { MealSlot } from "~/types/MealPlan";
import DayColumn from "./DayColumn";

interface Props {
  onMealSlotPress: (date: Date, slot: MealSlot) => void;
  onMealSlotDrop: (date: Date, slot: MealSlot) => void;
}

export default function MonthlyCalendar(props: Props) {
  const { selectedDate, selectDate } = useMealPlanCalendar();
  const dates = monthGridDates(selectedDate);
  const { data: plans = [], isLoading, error } = useCalendarMealPlans(dates[0]!, dates.at(-1)!);
  const days = groupMealsByDay(dates, plans);
  const selectedDay = days.find((day) => localDateKey(day.date) === localDateKey(selectedDate));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="flex-row px-3">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
          <P key={name} className="flex-1 text-center text-xs text-muted-foreground py-2">
            {name}
          </P>
        ))}
      </View>
      <View className="flex-row flex-wrap px-3">
        {days.map((day) => {
          const selected = localDateKey(day.date) === localDateKey(selectedDate);
          const count = Object.values(day.meals).flat().length;
          return (
            <Pressable
              key={localDateKey(day.date)}
              onPress={() => selectDate(day.date)}
              style={{ width: "14.2857%" }}
              className={`items-center rounded-lg py-3 ${selected ? "bg-primary/15" : ""}`}
              accessibilityRole="button"
              accessibilityLabel={`${day.date.toDateString()}, ${count} planned ${count === 1 ? "dish" : "dishes"}`}
              accessibilityState={{ selected }}
            >
              <P
                className={
                  day.date.getMonth() === selectedDate.getMonth()
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                }
              >
                {day.date.getDate()}
              </P>
              <P className="text-xs text-primary h-4">
                {count ? `${count} ${count === 1 ? "dish" : "dishes"}` : ""}
              </P>
            </Pressable>
          );
        })}
      </View>
      {isLoading ? (
        <ActivityIndicator className="my-4" />
      ) : error ? (
        <P className="px-5 py-3 text-destructive">Couldn't load meals. Try again.</P>
      ) : (
        selectedDay && (
          <View className="mx-5 mt-4">
            <P className="font-urbanist-semibold mb-3">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </P>
            <DayColumn dayMealPlan={selectedDay} {...props} />
          </View>
        )
      )}
    </ScrollView>
  );
}
