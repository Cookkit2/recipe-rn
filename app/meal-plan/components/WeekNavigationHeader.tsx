import React from "react";
import { View, Pressable } from "react-native";
import { P } from "~/components/ui/typography";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-uniwind";

interface WeekNavigationHeaderProps {
  selectedWeek: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function WeekNavigationHeader({
  selectedWeek,
  onPreviousWeek,
  onNextWeek,
}: WeekNavigationHeaderProps) {
  // Format week range for display
  const formatWeekRange = () => {
    const startDate = new Date(selectedWeek);
    const endDate = new Date(selectedWeek);
    endDate.setDate(endDate.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const start = startDate.toLocaleDateString("en-US", options);
    const end = endDate.toLocaleDateString("en-US", options);

    // Add year if different year
    if (startDate.getFullYear() !== endDate.getFullYear()) {
      const startWithYear = startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startWithYear} - ${endDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    }

    return `${start} - ${end}`;
  };

  return (
    <View className="bg-background/95 backdrop-blur-sm border-b border-border/20 px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onPreviousWeek}
          className="p-2 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Previous week"
        >
          <ChevronLeftIcon className="text-foreground" size={24} strokeWidth={2} />
        </Pressable>

        <View className="flex-1 items-center">
          <P className="text-muted-foreground text-xs font-urbanist-semibold uppercase tracking-wide">
            {formatWeekRange()}
          </P>
        </View>

        <Pressable
          onPress={onNextWeek}
          className="p-2 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <ChevronRightIcon className="text-foreground" size={24} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
