import React from "react";
import { act, render } from "@testing-library/react-native";
import MealPlanPage from "~/app/meal-plan";
import { MealPlanCalendarProvider } from "~/store/MealPlanCalendarContext";
import WeeklyCalendar from "../WeeklyCalendar";
import { toast } from "sonner-native";

const mockUpdateMeal = jest.fn();
const mockAddMeal = jest.fn();
jest.mock("~/hooks/queries/useMealPlanEntry", () => ({
  useMealPlanEntry: () => ({ update: { mutateAsync: mockUpdateMeal } }),
}));
jest.mock("~/hooks/queries/useMealPlanQueries", () => ({
  useAddToMealPlan: () => ({ mutateAsync: mockAddMeal }),
}));
jest.mock("~/hooks/queries/useRecipeQueries", () => ({ useRecipes: () => ({ data: [] }) }));
jest.mock("~/hooks/queries/useFeatureFlags", () => ({
  useFeatureFlag: () => ({ enabled: false, isLoading: false }),
}));
jest.mock("~/hooks/queries/useMealPlanGeneration", () => ({
  useMealPlanGeneration: () => ({ isPending: false }),
  DEFAULT_PLAN_SLOTS: [],
}));
jest.mock("~/hooks/useColor", () => () => ({ background: "white", foreground: "black" }));
jest.mock("~/utils/logger", () => ({ log: { info: jest.fn(), error: jest.fn() } }));
jest.mock("sonner-native", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../WeeklyCalendar", () => jest.fn(() => null));
jest.mock("../MonthlyCalendar", () => () => null);
jest.mock("../MealPlanDragOverlay", () => () => null);
jest.mock("../MacroTargetPanel", () => ({ MacroTargetPanel: () => null }));
jest.mock("~/app/meal-plan/components/RecipeSelectionSheet", () => ({
  RecipeSelectionSheet: () => null,
}));
jest.mock("lucide-uniwind", () => ({ ChevronLeftIcon: () => null, ChevronRightIcon: () => null }));
jest.mock("~/components/ui/typography", () => ({ P: "Text" }));
jest.mock("~/components/ui/button", () => ({ Button: "View" }));
jest.mock("expo-router", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  const Toolbar = Object.assign(
    ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    {
      Menu: View,
      MenuAction: Text,
      Label: Text,
    }
  );
  return {
    Stack: { Screen: () => null, Toolbar },
    useRouter: () => ({ back: jest.fn() }),
    useFocusEffect: (callback: () => () => void) => React.useEffect(callback, [callback]),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateMeal.mockResolvedValue(undefined);
});

async function renderPage() {
  await render(
    <MealPlanCalendarProvider>
      <MealPlanPage />
    </MealPlanCalendarProvider>
  );
  return jest.mocked(WeeklyCalendar).mock.calls.at(-1)![0].onMealSlotDrop!;
}

it("saves a drop by moving the existing meal ID and preserving servings", async () => {
  const onDrop = await renderPage();
  const targetDate = new Date(2026, 9, 27);
  await act(() =>
    onDrop(targetDate, "dinner", {
      mealPlanId: "planned-pasta",
      currentDate: new Date(2026, 9, 24),
      currentMealSlot: "lunch",
      servings: 3,
    })
  );
  expect(mockUpdateMeal).toHaveBeenCalledWith({
    id: "planned-pasta",
    date: targetDate,
    mealSlot: "dinner",
    servings: 3,
  });
  expect(mockAddMeal).not.toHaveBeenCalled();
  expect(toast.success).toHaveBeenCalledWith("Meal moved");
});

it("reports a failed move without creating another meal", async () => {
  mockUpdateMeal.mockRejectedValue(new Error("Database unavailable"));
  const onDrop = await renderPage();
  await act(() =>
    onDrop(new Date(2026, 9, 27), "dinner", {
      mealPlanId: "planned-pasta",
      currentDate: new Date(2026, 9, 24),
      currentMealSlot: "lunch",
      servings: 3,
    })
  );
  expect(mockAddMeal).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith("Couldn't move this meal. Please try again.");
});
