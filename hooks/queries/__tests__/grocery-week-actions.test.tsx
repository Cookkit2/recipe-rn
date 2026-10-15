import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MealPlanCalendarProvider, useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import { useRestoreGroceryItem } from "../useMealPlanQueries";
import { localDateKey } from "~/utils/meal-plan-calendar";
const mockSetDeleted = jest.fn(
  async (_name: string, _deleted: boolean, _week: string) => undefined
);
jest.mock("~/data/api/mealPlanApi", () => ({
  mealPlanApi: {
    groceryForWeek: (week: Date) => ({
      setGroceryItemDeleted: (name: string, deleted: boolean) =>
        mockSetDeleted(name, deleted, localDateKey(week)),
    }),
  },
}));

it("keeps an undo action bound to its original week after calendar navigation", async () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MealPlanCalendarProvider>{children}</MealPlanCalendarProvider>
    </QueryClientProvider>
  );
  const { result } = await renderHook(
    () => ({ restore: useRestoreGroceryItem(), calendar: useMealPlanCalendar() }),
    { wrapper }
  );
  const originalWeek = localDateKey(result.current.calendar.selectedWeek);
  const undo = result.current.restore.mutate;
  await act(async () => {
    result.current.calendar.changeSelectedWeek(new Date(Date.now() + 7 * 86400000));
  });
  await act(async () => {
    undo("egg");
  });
  await waitFor(() => expect(mockSetDeleted).toHaveBeenCalledWith("egg", false, originalWeek));
});
