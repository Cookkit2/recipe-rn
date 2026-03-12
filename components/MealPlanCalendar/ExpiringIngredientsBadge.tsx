import { useMemo } from "react";
import { View } from "react-native";
import { AlertTriangleIcon } from "lucide-uniwind";
import { P } from "~/components/ui/typography";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useExpiringItems } from "~/hooks/queries/usePantryQueries";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import type { Recipe } from "~/types/Recipe";

interface ExpiringIngredientsBadgeProps {
  /**
   * Array of recipes to check for expiring ingredients
   */
  recipes?: Array<{ recipe?: Recipe | null }>;
  /**
   * Size variant for the badge
   * @default 'sm'
   */
  size?: "sm" | "md";
  /**
   * Whether to show the icon alongside the count
   * @default true
   */
  showIcon?: boolean;
  /**
   * Number of days to consider as "expiring soon"
   * @default 3
   */
  daysUntilExpiry?: number;
}

/**
 * ExpiringIngredientsBadge Component
 *
 * Displays a badge showing the count of expiring ingredients
 * that are used in the provided planned recipes.
 *
 * This helps users see at a glance which planned meals use
 * ingredients that will expire soon, encouraging them to
 * cook those recipes first.
 */
export default function ExpiringIngredientsBadge({
  recipes,
  size = "sm",
  showIcon = true,
  daysUntilExpiry = 3,
}: ExpiringIngredientsBadgeProps) {
  const { data: expiringItems = [], isLoading } = useExpiringItems(daysUntilExpiry);

  // Calculate count of unique expiring ingredients used in recipes
  const expiringCount = useMemo(() => {
    if (!recipes || recipes.length === 0 || expiringItems.length === 0) {
      return 0;
    }

    // Collect all unique ingredient names from recipes
    const recipeIngredientNames = new Set<string>();

    for (const mealPlanItem of recipes) {
      if (!mealPlanItem.recipe) continue;

      const recipe = mealPlanItem.recipe;
      for (const ingredient of recipe.ingredients) {
        recipeIngredientNames.add(ingredient.name.toLowerCase().trim());
      }
    }

    // Match expiring pantry items against recipe ingredients
    const matchedExpiringItems = new Set<string>();

    for (const expiringItem of expiringItems) {
      for (const recipeIngredient of recipeIngredientNames) {
        if (isIngredientMatch(expiringItem.name, recipeIngredient, expiringItem.synonyms?.map((s: any) => s.synonym))) {
          matchedExpiringItems.add(expiringItem.name);
          break; // Found a match, no need to check other ingredients
        }
      }
    }

    return matchedExpiringItems.size;
  }, [recipes, expiringItems]);

  // Don't render if loading, no count, or no recipes provided
  if (isLoading || expiringCount === 0) {
    return null;
  }

  // Size configurations
  const sizeClasses = size === "sm"
    ? "min-w-5 h-5 px-1"
    : "min-w-6 h-6 px-1.5";

  const textSizeClasses = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? 10 : 12;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className={`bg-orange-500 rounded-full ${sizeClasses} items-center justify-center flex-row`}
    >
      {showIcon && (
        <AlertTriangleIcon className="text-white mr-0.5" size={iconSize} strokeWidth={2.5} />
      )}
      <P className={`text-white font-urbanist-bold ${textSizeClasses}`}>
        {expiringCount > 99 ? "99+" : expiringCount}
      </P>
    </Animated.View>
  );
}

/**
 * Hook to get just the count of expiring ingredients used in recipes
 * Useful for badge display without rendering the component
 */
export function useExpiringIngredientsCount(
  recipes?: Array<{ recipe?: Recipe | null }>,
  daysUntilExpiry: number = 3
) {
  const { data: expiringItems = [], isLoading } = useExpiringItems(daysUntilExpiry);

  const count = useMemo(() => {
    if (!recipes || recipes.length === 0 || expiringItems.length === 0) {
      return 0;
    }

    const recipeIngredientNames = new Set<string>();

    for (const mealPlanItem of recipes) {
      if (!mealPlanItem.recipe) continue;

      const recipe = mealPlanItem.recipe;
      for (const ingredient of recipe.ingredients) {
        recipeIngredientNames.add(ingredient.name.toLowerCase().trim());
      }
    }

    const matchedExpiringItems = new Set<string>();

    for (const expiringItem of expiringItems) {
      for (const recipeIngredient of recipeIngredientNames) {
        if (isIngredientMatch(expiringItem.name, recipeIngredient, expiringItem.synonyms?.map((s: any) => s.synonym))) {
          matchedExpiringItems.add(expiringItem.name);
          break;
        }
      }
    }

    return matchedExpiringItems.size;
  }, [recipes, expiringItems]);

  return {
    count,
    isLoading,
  };
}
