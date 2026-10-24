import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { ChevronLeftIcon } from "lucide-uniwind";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useMealPlanCalendar, type MealDropHandler } from "~/store/MealPlanCalendarContext";
import MonthlyCalendar from "~/components/MealPlanCalendar/MonthlyCalendar";
import type { Recipe } from "~/types/Recipe";
import WeeklyCalendar from "~/components/MealPlanCalendar/WeeklyCalendar";
import MealPlanDragOverlay from "~/components/MealPlanCalendar/MealPlanDragOverlay";
import { MacroTargetPanel } from "~/components/MealPlanCalendar/MacroTargetPanel";
import { useRecipes } from "~/hooks/queries/useRecipeQueries";
import { useAddToMealPlan } from "~/hooks/queries/useMealPlanQueries";
import { useMealPlanEntry } from "~/hooks/queries/useMealPlanEntry";
import { useMealPlanGeneration, DEFAULT_PLAN_SLOTS } from "~/hooks/queries/useMealPlanGeneration";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";
import type { MealSlot } from "~/types/MealPlan";
import type { MacroTarget, NutritionSummary } from "~/types/Nutrition";
import { WeekNavigationHeader, RecipeSelectionSheet, MealPlanHeaderRight } from "./components";
import useColors from "~/hooks/useColor";
import { log } from "~/utils/logger";
import { toast } from "sonner-native";

export default function MealPlanPage() {
  const router = useRouter();
  const colors = useColors();
  const {
    selectedWeek,
    changeSelectedWeek,
    isRecipeSheetOpen,
    updateRecipeSheetOpen,
    cancelMealDrag,
    selectSlot,
    selectedSlot,
    selectedDate,
    selectDate,
    viewMode,
    setViewMode,
  } = useMealPlanCalendar();
  const { data: recipes = [], isLoading: isLoadingRecipes } = useRecipes();
  const addToMealPlan = useAddToMealPlan();
  const { update } = useMealPlanEntry();
  const updateMeal = update.mutateAsync;

  useFocusEffect(useCallback(() => cancelMealDrag, [cancelMealDrag]));

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
    selectSlot({ date, mealSlot });
    updateRecipeSheetOpen(true);
  };

  const handleSelectRecipe = async (recipe: Recipe) => {
    const target = selectedSlot ?? { date: selectedDate, mealSlot: "dinner" as const };
    try {
      await addToMealPlan.mutateAsync({
        recipeId: recipe.id,
        servings: recipe.servings ?? 2,
        ...target,
      });
      updateRecipeSheetOpen(false);
      toast.success("Recipe added to meal plan");
    } catch {
      toast.error("Couldn't add this recipe. Please try again.");
    }
  };

  const handleMealSlotDrop = useCallback<MealDropHandler>(
    async (date, mealSlot, data) => {
      try {
        await updateMeal({ id: data.mealPlanId, date, mealSlot, servings: data.servings });
        toast.success("Meal moved");
      } catch {
        toast.error("Couldn't move this meal. Please try again.");
      }
    },
    [updateMeal]
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: false,
          headerLargeTitleEnabled: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitle: "Meal Plan",
          headerLeft: () => (
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Back"
              onPress={() => router.back()}
            >
              <ChevronLeftIcon className="text-foreground" size={24} />
            </Button>
          ),
        }}
      />

      <MealPlanHeaderRight
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        aiMealPlanEnabled={aiMealPlanEnabled}
        isFlagLoading={isFlagLoading}
        isPendingGeneration={generateWeekPlan.isPending}
        onPlanMyWeek={handlePlanMyWeek}
      />
      {viewMode === "month" ? (
        <View className="flex-row items-center justify-between px-5 py-3">
          <Button
            variant="ghost"
            accessibilityLabel="Previous month"
            onPress={() =>
              selectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))
            }
          >
            <P>‹</P>
          </Button>
          <P className="font-urbanist-semibold">
            {selectedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </P>
          <Button
            variant="ghost"
            accessibilityLabel="Next month"
            onPress={() =>
              selectDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))
            }
          >
            <P>›</P>
          </Button>
        </View>
      ) : (
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
        />
      )}
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
      {viewMode === "month" ? (
        <MonthlyCalendar
          onMealSlotPress={handleMealSlotPress}
          onMealSlotDrop={handleMealSlotDrop}
        />
      ) : (
        <WeeklyCalendar onMealSlotPress={handleMealSlotPress} onMealSlotDrop={handleMealSlotDrop} />
      )}

      {/* Recipe Selection Panel (Bottom Sheet) */}
      <RecipeSelectionSheet
        isOpen={isRecipeSheetOpen}
        onClose={() => updateRecipeSheetOpen(false)}
        isLoading={isLoadingRecipes}
        recipes={recipes}
        onSelect={handleSelectRecipe}
        targetLabel={`${(selectedSlot?.date ?? selectedDate).toLocaleDateString()} · ${selectedSlot?.mealSlot ?? "dinner"}`}
      />

      <MealPlanDragOverlay />
    </View>
  );
}
