import React, { useMemo } from "react";
import { View, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { LegendList } from "@legendapp/list";
import { useRecentlyCookedRecipes } from "~/hooks/queries/useCookingHistoryQueries";
import { useRecipes } from "~/hooks/queries/useRecipeQueries";
import { H1, H4, P } from "~/components/ui/typography";

import Header from "~/components/Shared/Header";
import { ChefHatIcon } from "lucide-nativewind";
import CookedRecipeCard from "~/components/Profile/CookedRecipes/CookedRecipeCard";

export default function CookedRecipes() {
  // Fetch recently cooked recipes
  const {
    data: cookedRecipes,
    isLoading,
    error,
  } = useRecentlyCookedRecipes(50);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Cooked Recipes" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <P className="mt-4 text-muted-foreground">
            Loading cooked recipes...
          </P>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Cooked Recipes" />
        <View className="flex-1 items-center justify-center px-6">
          <P className="text-destructive text-center">{error.message}</P>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="" />
      <View className="p-6 pb-4 flex-row items-center gap-3">
        <H1 className="font-bowlby-one pt-2">Cooked Recipes</H1>
      </View>
      <LegendList
        keyExtractor={(item) => item.recipeId}
        numColumns={2}
        className="px-3 flex-1"
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
    </View>
  );
}
