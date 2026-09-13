import React from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { PlusIcon, BookTemplateIcon, SparklesIcon } from "lucide-uniwind";

interface MealPlanHeaderRightProps {
  aiMealPlanEnabled: boolean;
  isFlagLoading: boolean;
  isPendingGeneration: boolean;
  onPlanMyWeek: () => void;
  onOpenTemplateSheet: () => void;
  onOpenRecipeSheet: () => void;
}

export function MealPlanHeaderRight({
  aiMealPlanEnabled,
  isFlagLoading,
  isPendingGeneration,
  onPlanMyWeek,
  onOpenTemplateSheet,
  onOpenRecipeSheet,
}: MealPlanHeaderRightProps) {
  return (
    <View className="flex-row items-center gap-2">
      {/* "Plan my week" auto-generation (#727). Dark-launched behind the
          ai_meal_plan feature flag; rendered only once the flag resolves
          so the header never flickers. */}
      {aiMealPlanEnabled && !isFlagLoading && (
        <Pressable
          onPress={onPlanMyWeek}
          disabled={isPendingGeneration}
          className="px-2 py-2 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Plan my week automatically"
          accessibilityHint="Generates a pantry-aware week plan from your recipes"
        >
          {isPendingGeneration ? (
            <ActivityIndicator size="small" className="text-foreground" />
          ) : (
            <SparklesIcon className="text-foreground" strokeWidth={2} size={22} />
          )}
        </Pressable>
      )}
      <Pressable
        onPress={onOpenTemplateSheet}
        className="px-2 py-2 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Meal plan templates"
      >
        <BookTemplateIcon className="text-foreground" strokeWidth={2} size={22} />
      </Pressable>
      <Pressable
        onPress={onOpenRecipeSheet}
        className="px-4 py-2 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Add recipe"
      >
        <PlusIcon className="text-foreground" strokeWidth={2.618} />
      </Pressable>
    </View>
  );
}
