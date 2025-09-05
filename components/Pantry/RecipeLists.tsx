import React, { useMemo } from "react";
import RecipeItemCard from "./RecipeItemCard";
import { Animated, View, ActivityIndicator } from "react-native";
import { useRecipeStore } from "~/store/RecipeContext";
import { H4, P } from "../ui/typography";
import { useRecipes } from "~/hooks/queries/useRecipeQueries";

export default function RecipeLists() {
  const { selectedRecipeTags } = useRecipeStore();
  const { data: recipes = [], isLoading, error } = useRecipes();

  // Filtered recipes based on selected tags
  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) =>
        selectedRecipeTags.length > 0
          ? recipe.tags?.some((tag) => selectedRecipeTags.includes(tag))
          : true
      ),
    [recipes, selectedRecipeTags]
  );

  if (isLoading) {
    return (
      <View className="py-16 items-center justify-center">
        <ActivityIndicator size="small" />
        <P className="mt-2 text-muted-foreground">Loading recipes...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="py-16 items-center justify-center">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  return (
    <Animated.FlatList
      numColumns={2}
      className="px-3 mt-6"
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      data={filteredRecipes}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <RecipeItemCard key={item.id} recipe={item} />}
      ListEmptyComponent={
        <View className="py-16 items-center justify-center">
          <H4 className="text-muted-foreground text-center">
            No recipes found
          </H4>
          <P className="text-muted-foreground text-center text-sm mt-1">
            Try adjusting your filters or add some ingredients
          </P>
        </View>
      }
    />
  );
}
