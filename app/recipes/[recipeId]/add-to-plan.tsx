import { useGlobalSearchParams } from "expo-router";
import AddToPlanModal from "~/components/Recipe/Details/AddToPlanModal";

/**
 * Add to Plan Route
 *
 * This route displays a modal for selecting a date and meal slot
 * before adding a recipe to the meal plan.
 */
export default function AddToPlanRoute() {
  const { recipeId } = useGlobalSearchParams<{ recipeId: string }>();

  if (!recipeId) {
    return null;
  }

  return <AddToPlanModal recipeId={recipeId} />;
}
