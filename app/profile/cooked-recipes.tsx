import React from "react";
import { View, ActivityIndicator } from "react-native";
import { LegendList } from "@legendapp/list";
import { useRecentlyCookedRecipes } from "~/hooks/queries/useCookingHistoryQueries";
import { H4, P } from "~/components/ui/typography";
import { ChefHatIcon } from "lucide-uniwind";
import CookedRecipeCard from "~/components/Profile/CookedRecipes/CookedRecipeCard";

export default function CookedRecipes() {
  // Fetch recently cooked recipes
  const { data: cookedRecipes, isLoading, error } = useRecentlyCookedRecipes(50);

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
    <LegendList
      contentInsetAdjustmentBehavior="automatic"
      keyExtractor={(item) => item.recipeId}
      numColumns={2}
      className="px-3 bg-background"
      showsVerticalScrollIndicator={false}
      data={cookedRecipes || []}
      renderItem={({ item }) => (
        <CookedRecipeCard
          key={item.recipeId}
          recipeId={item.recipeId}
          cookCount={item.cookCount}
          lastCookedAt={item.lastCookedAt}
        />
      )}
      ListEmptyComponent={
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
