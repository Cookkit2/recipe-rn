import { Pressable } from "react-native";
import { CalendarPlusIcon, CalendarCheckIcon } from "lucide-uniwind";
import { useIsRecipeInPlan, useRemoveFromMealPlan } from "~/hooks/queries/useMealPlanQueries";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";
import { useGlobalSearchParams, useRouter } from "expo-router";

export default function AddToPlanHeaderButton() {
  const { recipeId } = useGlobalSearchParams<{ recipeId: string }>();
  const router = useRouter();

  const { data: isInPlan, isLoading: isCheckingPlan } = useIsRecipeInPlan(recipeId);
  const removeFromMealPlan = useRemoveFromMealPlan();

  const handlePlanPress = () => {
    if (isInPlan) {
      // Remove from plan
      removeFromMealPlan.mutate(recipeId);
    } else if (recipeId) {
      // Navigate to add-to-plan modal to select date and meal slot
      router.push(`/recipes/${recipeId}/add-to-plan`);
    }
  };

  const isDisabled = isCheckingPlan || removeFromMealPlan.isPending || !recipeId;

  return (
    <Pressable
      onPress={handlePlanPress}
      disabled={isDisabled}
      hitSlop={8}
      style={{ opacity: isDisabled ? 0.5 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={isInPlan ? "Remove from meal plan" : "Add to meal plan"}
      accessibilityState={{ disabled: isDisabled, checked: isInPlan }}
    >
      {isInPlan ? (
        <CalendarCheckIcon className="text-green-500" size={24} strokeWidth={2} />
      ) : (
        <CalendarPlusIcon className="text-foreground" size={24} strokeWidth={2} />
      )}
    </Pressable>
  );
}
