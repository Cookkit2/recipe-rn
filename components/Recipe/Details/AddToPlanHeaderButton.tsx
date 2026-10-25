import { Platform, PlatformColor, Pressable } from "react-native";
import { SymbolView } from "expo-symbols";
import useColors from "~/hooks/useColor";
import { CalendarPlusIcon, CalendarCheckIcon } from "lucide-uniwind";
import { useIsRecipeInPlan, useRemoveFromMealPlan } from "~/hooks/queries/useMealPlanQueries";
import { useGlobalSearchParams, useRouter } from "expo-router";

export default function AddToPlanHeaderButton() {
  const colors = useColors();
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
      className="h-11 w-11 items-center justify-center"
      style={{ opacity: isDisabled ? 0.5 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={isInPlan ? "Remove from meal plan" : "Add to meal plan"}
      accessibilityState={{ disabled: isDisabled, checked: isInPlan }}
    >
      {Platform.OS === "ios" ? (
        <SymbolView
          name={isInPlan ? "calendar.badge.checkmark" : "calendar.badge.plus"}
          size={22}
          weight="regular"
          tintColor={isInPlan ? PlatformColor("systemGreen") : colors.foreground}
        />
      ) : isInPlan ? (
        <CalendarCheckIcon className="text-green-500" size={24} strokeWidth={2} />
      ) : (
        <CalendarPlusIcon className="text-foreground" size={24} strokeWidth={2} />
      )}
    </Pressable>
  );
}
