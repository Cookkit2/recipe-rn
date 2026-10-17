import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import React from "react";
import { View, ActivityIndicator } from "react-native";
import RecyclingList from "~/components/Shared/RecyclingList";
import { useRecentlyCookedRecipes } from "~/hooks/queries/useCookingHistoryQueries";
import { H4, P } from "~/components/ui/typography";
import { ChefHatIcon } from "lucide-uniwind";
import CookedRecipeCard from "~/components/Profile/CookedRecipes/CookedRecipeCard";

export default function CookedRecipes() {
  const headerHeight = useHeaderHeight();
  const { bottom } = useSafeAreaInsets();
  // Fetch recently cooked recipes
  const { data: cookedRecipes, isLoading, error } = useRecentlyCookedRecipes(50);
  type CookedItem = NonNullable<typeof cookedRecipes>[number];
  const renderRecipe = React.useCallback(
    ({ item }: { item: CookedItem }) => (
      <CookedRecipeCard
        recipeId={item.recipeId}
        cookCount={item.cookCount}
        lastCookedAt={item.lastCookedAt}
      />
    ),
    []
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading cooked recipes...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  return (
    <RecyclingList
      keyExtractor={(item) => item.recipeId}
      numColumns={2}
      className="bg-background"
      contentPadding={{ left: 12, right: 12, top: headerHeight, bottom: bottom + 16 }}
      estimatedItemSize={290}
      data={cookedRecipes || []}
      renderItem={renderRecipe}
      empty={
        <View className="py-16 items-center justify-center">
          <ChefHatIcon size={64} className="text-muted-foreground mb-4" />
          <H4 className="text-muted-foreground font-urbanist-semibold text-center">
            No cooked recipes yet
          </H4>
          <P className="text-muted-foreground font-urbanist-regular text-center text-sm mt-1 px-6">
            Start cooking some recipes and they'll appear here!
          </P>
        </View>
      }
    />
  );
}
