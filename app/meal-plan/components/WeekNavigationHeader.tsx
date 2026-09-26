import React from "react";
import { View, Pressable } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "lucide-uniwind";

interface WeekNavigationHeaderProps {
  selectedWeek: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
}

export function WeekNavigationHeader({
  selectedWeek,
  onPreviousWeek,
  onNextWeek,
  onGoToToday,
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

  // Check if current week is this week
  const isCurrentWeek = () => {
    const now = new Date();
    const weekStart = new Date(selectedWeek);
    const weekEnd = new Date(selectedWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return now >= weekStart && now <= weekEnd;
  };

  return (
    <View className="bg-background/95 backdrop-blur-sm border-b border-border/20 px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onPreviousWeek}
          className="p-2"
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
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel="Next week"
        >
          <ChevronRightIcon className="text-foreground" size={24} strokeWidth={2} />
        </Pressable>
      </View>

      {!isCurrentWeek() && (
        <View className="items-center mt-2">
          <Button variant="ghost" size="sm" onPress={onGoToToday} className="h-7 px-3 rounded-full">
            <CalendarIcon size={14} strokeWidth={2} className="text-foreground mr-1" />
            <P className="text-xs font-urbanist-semibold text-foreground">Today</P>
          </Button>
        </View>
      )}
    </View>
  );
}
