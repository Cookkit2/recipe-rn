import { Stack } from "expo-router";

interface MealPlanHeaderRightProps {
  viewMode: "week" | "month";
  onViewModeChange: (mode: "week" | "month") => void;
  aiMealPlanEnabled: boolean;
  isFlagLoading: boolean;
  isPendingGeneration: boolean;
  onPlanMyWeek: () => void;
}

export function MealPlanHeaderRight({
  viewMode,
  onViewModeChange,
  aiMealPlanEnabled,
  isFlagLoading,
  isPendingGeneration,
  onPlanMyWeek,
}: MealPlanHeaderRightProps) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="Meal plan options">
        <Stack.Toolbar.Label>Options</Stack.Toolbar.Label>
        <Stack.Toolbar.MenuAction
          isOn={viewMode === "week"}
          onPress={() => onViewModeChange("week")}
        >
          Week
        </Stack.Toolbar.MenuAction>
        <Stack.Toolbar.MenuAction
          isOn={viewMode === "month"}
          onPress={() => onViewModeChange("month")}
        >
          Month
        </Stack.Toolbar.MenuAction>
        {aiMealPlanEnabled && !isFlagLoading && (
          <Stack.Toolbar.MenuAction disabled={isPendingGeneration} onPress={onPlanMyWeek}>
            Plan my week
          </Stack.Toolbar.MenuAction>
        )}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
