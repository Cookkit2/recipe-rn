import React, { useCallback, useState } from "react";
import { View, Pressable, ActivityIndicator, FlatList } from "react-native";
import { H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarIcon,
  BookTemplateIcon,
} from "lucide-uniwind";
import { Stack, useRouter } from "expo-router";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import WeeklyCalendar from "~/components/MealPlanCalendar/WeeklyCalendar";
import TemplateSheet from "~/components/MealPlanCalendar/TemplateSheet";
import { useRecipes } from "~/hooks/queries/useRecipeQueries";
import { useAddToMealPlan } from "~/hooks/queries/useMealPlanQueries";
import type { MealSlot } from "~/types/MealPlan";
import type { RecipeDragData } from "~/types/MealPlan";
import RecipeDraggable from "~/components/MealPlanCalendar/RecipeDraggable";
import * as Haptics from "expo-haptics";
import { log } from "~/utils/logger";
import { toast } from "sonner-native";

export default function MealPlanPage() {
  const router = useRouter();
  const { selectedWeek, changeSelectedWeek, isRecipeSheetOpen, updateRecipeSheetOpen, dragState } =
    useMealPlanCalendar();
  const { data: recipes = [], isLoading: isLoadingRecipes } = useRecipes();
  const addToMealPlan = useAddToMealPlan();
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false);

  // Week navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() - 7);
    changeSelectedWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + 7);
    changeSelectedWeek(newDate);
  };

  const goToToday = () => {
    changeSelectedWeek(new Date());
  };

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

  // Handle meal slot press to open recipe selection
  const handleMealSlotPress = (date: Date, mealSlot: MealSlot) => {
    updateRecipeSheetOpen(true);
  };

  // Handle recipe drop on meal slot (from drag-and-drop)
  const handleMealSlotDrop = useCallback(
    async (date: Date, mealSlot: MealSlot) => {
      // Check if something is being dragged
      if (!dragState.isDragging || !dragState.data) {
        return;
      }

      // Check if it's a recipe being dragged
      const dragData = dragState.data as RecipeDragData;
      if (dragData.recipeId) {
        try {
          // Haptic feedback for successful drop
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // Add recipe to meal plan at the specified date and slot
          await addToMealPlan.mutateAsync({
            recipeId: dragData.recipeId,
            servings: dragData.servings,
            date,
            mealSlot,
          });

          // Close recipe sheet after successful drop
          updateRecipeSheetOpen(false);

          // Show success toast
          toast.success("Recipe added to meal plan");

          log.info(`Added recipe ${dragData.recipeId} to ${date.toDateString()} ${mealSlot}`);
        } catch (error) {
          log.error("Error adding recipe to meal plan:", error);
          toast.error("Failed to add recipe to meal plan. Please try again.");
        }
      }
    },
    [dragState, addToMealPlan, updateRecipeSheetOpen]
  );

  // Handle template applied callback to refresh the view
  const handleTemplateApplied = useCallback(() => {
    // Calendar will auto-refresh via React Query invalidation
    log.info("Template applied, calendar will refresh");
  }, []);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: "",
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setIsTemplateSheetOpen(true)}
                className="px-2 py-2"
                accessibilityRole="button"
                accessibilityLabel="Meal plan templates"
              >
                <BookTemplateIcon className="text-foreground" strokeWidth={2} size={22} />
              </Pressable>
              <Pressable
                onPress={() => updateRecipeSheetOpen(true)}
                className="px-4 py-2"
                accessibilityRole="button"
                accessibilityLabel="Add recipe"
              >
                <PlusIcon className="text-foreground" strokeWidth={2.618} />
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Week Navigation Header */}
      <View className="bg-background/95 backdrop-blur-sm border-b border-border/20 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={goToPreviousWeek}
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
            onPress={goToNextWeek}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Next week"
          >
            <ChevronRightIcon className="text-foreground" size={24} strokeWidth={2} />
          </Pressable>
        </View>

        {!isCurrentWeek() && (
          <View className="items-center mt-2">
            <Button variant="ghost" size="sm" onPress={goToToday} className="h-7 px-3 rounded-full">
              <CalendarIcon size={14} strokeWidth={2} className="text-foreground mr-1" />
              <P className="text-xs font-urbanist-semibold text-foreground">Today</P>
            </Button>
          </View>
        )}
      </View>

      {/* Weekly Calendar */}
      <WeeklyCalendar onMealSlotPress={handleMealSlotPress} onMealSlotDrop={handleMealSlotDrop} />

      {/* Recipe Selection Panel (Bottom Sheet) */}
      {isRecipeSheetOpen && (
        <View className="absolute inset-x-0 bottom-0 top-0 bg-background/80">
          <View className="absolute bottom-0 left-0 right-0 max-h-[70%] bg-background rounded-t-3xl border-t border-border/20 shadow-2xl">
            {/* Handle Bar */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-3 border-b border-border/10">
              <H3 className="font-bowlby-one">Select Recipe</H3>
              <Pressable
                onPress={() => updateRecipeSheetOpen(false)}
                className="p-2"
                accessibilityRole="button"
                accessibilityLabel="Close recipe selection"
              >
                <P className="text-muted-foreground font-urbanist-semibold">Done</P>
              </Pressable>
            </View>

            {/* Recipe List */}
            {isLoadingRecipes ? (
              <View className="flex-1 items-center justify-center py-12">
                <ActivityIndicator size="large" />
                <P className="mt-4 text-muted-foreground">Loading recipes...</P>
              </View>
            ) : recipes.length === 0 ? (
              <View className="flex-1 items-center justify-center py-12 px-6">
                <P className="text-muted-foreground text-center">No recipes available.</P>
              </View>
            ) : (
              <FlatList
                data={recipes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View className="mb-3">
                    <RecipeDraggable recipe={item} servings={4} />
                  </View>
                )}
                className="flex-1 px-4 pt-4 pb-8"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
              />
            )}
          </View>
        </View>
      )}

      {/* Template Sheet */}
      {isTemplateSheetOpen && (
        <TemplateSheet
          onTemplateApplied={handleTemplateApplied}
          onClose={() => setIsTemplateSheetOpen(false)}
        />
      )}
    </View>
  );
}
