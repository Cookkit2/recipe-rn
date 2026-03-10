import { View, Image, ScrollView, Pressable } from "react-native";
import { H3, H4, P } from "~/components/ui/typography";
import { useMealPlanItems } from "~/hooks/queries/useMealPlanQueries";
import { useRouter } from "expo-router";
import { Separator } from "~/components/ui/separator";
import RecipeChip from "./RecipeChip";

interface GroceryListHeaderProps {
  isSelectionMode?: boolean;
  selectedRecipeIds?: Set<string>;
  onToggleRecipe?: (id: string) => void;
}

export default function GroceryListHeader({
  isSelectionMode = false,
  selectedRecipeIds = new Set(),
  onToggleRecipe,
}: GroceryListHeaderProps) {
  const { data: mealPlanItems = [] } = useMealPlanItems();

  // Get unique recipes
  const recipes = Array.from(
    new Map(mealPlanItems.map((item) => [item.recipe?.id, item.recipe])).values()
  );

  const count = recipes.length;

  if (count === 0) return null;

  return (
    <>
      <P className="text-muted-foreground mb-4 px-5">
        Grocery list for{" "}
        <P className="font-urbanist-bold text-foreground">
          {count} {count === 1 ? "recipe" : "recipes"}
        </P>
      </P>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-6 px-5"
        contentContainerStyle={{ gap: 12, paddingRight: 24 }}
      >
        {recipes.map((recipe) => {
          if (!recipe) return null;
          const isSelected = selectedRecipeIds.has(recipe.id);

          return (
            <RecipeChip
              key={recipe.id}
              recipe={recipe}
              isSelectionMode={isSelectionMode}
              isSelected={isSelected}
              onToggleRecipe={onToggleRecipe}
            />
          );
        })}
      </ScrollView>
      <Separator className="mb-4" />
      <H3 className="px-5 mb-3 font-urbanist-semibold">Items to Buy</H3>
    </>
  );
}
