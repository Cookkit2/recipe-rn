import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mealPlanApi } from "~/data/api/mealPlanApi";
import { mealPlanQueryKeys } from "./mealPlanQueryKeys";

export function useMealPlanEntry() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: mealPlanQueryKeys.all });
    await queryClient.invalidateQueries({ queryKey: ["grocery_attributes"] });
  };
  const update = useMutation({
    mutationFn: ({ id, ...data }: { id: string; servings: number; date: Date; mealSlot: string }) =>
      mealPlanApi.updateEntry(id, data),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => mealPlanApi.removeEntry(id),
    onSuccess: refresh,
  });
  return { update, remove };
}
