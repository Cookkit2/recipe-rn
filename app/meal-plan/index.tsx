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
  SparklesIcon,
} from "lucide-uniwind";
import { Stack, useRouter } from "expo-router";
import { useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import WeeklyCalendar from "~/components/MealPlanCalendar/WeeklyCalendar";
import TemplateSheet from "~/components/MealPlanCalendar/TemplateSheet";
import { MacroTargetPanel } from "~/components/MealPlanCalendar/MacroTargetPanel";
import { useRecipes } from "~/hooks/queries/useRecipeQueries";
import { useAddToMealPlan } from "~/hooks/queries/useMealPlanQueries";
import { useMealPlanGeneration, DEFAULT_PLAN_SLOTS } from "~/hooks/queries/useMealPlanGeneration";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";
import type { MealSlot } from "~/types/MealPlan";
import type { RecipeDragData } from "~/types/MealPlan";
import type { MacroTarget, NutritionSummary } from "~/types/Nutrition";
import RecipeDraggable from "~/components/MealPlanCalendar/RecipeDraggable";
import { WeekNavigationHeader, RecipeSelectionSheet, MealPlanHeaderRight } from "./components";
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

  // "Plan my week" auto-generation (#727, MVP). Dark-launched behind a feature
  // flag so it can be rolled back without a release. Defaults to disabled while
  // the flag is loading so the button never flickers on.
  const { enabled: aiMealPlanEnabled, isLoading: isFlagLoading } = useFeatureFlag("ai_meal_plan");
  const generateWeekPlan = useMealPlanGeneration();

  // Macro/calorie target for target-driven generation (#746). Held in state and
  // persisted by the panel; fed to the planner so picks bias toward the goal.
  // The panel itself is also dark-launched behind ai_meal_plan.
  const [macroTarget, setMacroTarget] = useState<MacroTarget>({});
  const [projectedMacros, setProjectedMacros] = useState<NutritionSummary | null>(null);
  const PLAN_DAYS = 7;

  const handlePlanMyWeek = useCallback(async () => {
    try {
      // Plan the currently-selected week (normalized to its start-of-day).
      const weekStart = new Date(selectedWeek);
      weekStart.setHours(0, 0, 0, 0);
      const result = await generateWeekPlan.mutateAsync({
        weekStart,
        days: PLAN_DAYS,
        mealSlots: DEFAULT_PLAN_SLOTS,
        macroTarget,
      });
      setProjectedMacros(result.projectedMacros);
      toast.success(`Planned ${result.meals.length} meals for your week`);
      log.info(`Plan my week: generated ${result.meals.length} meals`);
    } catch (error) {
      log.error("Plan my week failed:", error);
      const message =
        error instanceof Error ? error.message : "Could not generate a plan. Please try again.";
      toast.error(message);
    }
  }, [generateWeekPlan, selectedWeek, macroTarget]);

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
            <MealPlanHeaderRight
              aiMealPlanEnabled={aiMealPlanEnabled}
              isFlagLoading={isFlagLoading}
              isPendingGeneration={generateWeekPlan.isPending}
              onPlanMyWeek={handlePlanMyWeek}
              onOpenTemplateSheet={() => setIsTemplateSheetOpen(true)}
              onOpenRecipeSheet={() => updateRecipeSheetOpen(true)}
            />
          ),
        }}
      />

      {/* Week Navigation Header */}
      <WeekNavigationHeader
        selectedWeek={selectedWeek}
        onPreviousWeek={() => {
          const newDate = new Date(selectedWeek);
          newDate.setDate(newDate.getDate() - 7);
          changeSelectedWeek(newDate);
        }}
        onNextWeek={() => {
          const newDate = new Date(selectedWeek);
          newDate.setDate(newDate.getDate() + 7);
          changeSelectedWeek(newDate);
        }}
        onGoToToday={() => {
          changeSelectedWeek(new Date());
        }}
      />

      {/* Macro target panel — dark-launched behind ai_meal_plan (#746). Placed
          above the calendar so the target input + projected readout stay
          visible while the flag is on. */}
      {aiMealPlanEnabled && !isFlagLoading && (
        <MacroTargetPanel
          onTargetChange={setMacroTarget}
          planDays={PLAN_DAYS}
          projectedMacros={projectedMacros}
        />
      )}

      {/* Weekly Calendar */}
      <WeeklyCalendar onMealSlotPress={handleMealSlotPress} onMealSlotDrop={handleMealSlotDrop} />

      {/* Recipe Selection Panel (Bottom Sheet) */}
      <RecipeSelectionSheet
        isOpen={isRecipeSheetOpen}
        onClose={() => updateRecipeSheetOpen(false)}
        isLoading={isLoadingRecipes}
        recipes={recipes}
      />

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
