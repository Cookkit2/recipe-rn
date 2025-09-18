import React, { useMemo } from "react";
import RecipeItemCard from "./RecipeItemCard";
import { Animated, View, ActivityIndicator } from "react-native";
import { useRecipeStore } from "~/store/RecipeContext";
import { H4, P } from "../ui/typography";
import {
  useRecipes,
  useRecipeRecommendations,
} from "~/hooks/queries/useRecipeQueries";

export default function RecipeLists() {
  const { selectedRecipeTags, showRecommendations } = useRecipeStore();
  const { data: recipes = [], isLoading, error } = useRecipes();
  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useRecipeRecommendations({
    categories: selectedRecipeTags.length > 0 ? selectedRecipeTags : undefined,
    maxRecommendations: 8,
    preferCompleteable: true,
  });

  // Determine which recipes to show
  const recipesToShow = useMemo(() => {
    if (showRecommendations && recommendations) {
      // Combine can make and partial recommendations
      const allRecommendations = [
        ...recommendations.canMakeRecommendations,
        ...recommendations.partialRecommendations.map((item) => item.recipe),
      ];
      return allRecommendations;
    }

    // Regular filtered recipes based on selected tags
    return recipes.filter((recipe) =>
      selectedRecipeTags.length > 0
        ? recipe.tags?.some((tag) => selectedRecipeTags.includes(tag))
        : true
    );
  }, [showRecommendations, recommendations, recipes, selectedRecipeTags]);

  // Handle loading states
  const isDataLoading = showRecommendations
    ? recommendationsLoading
    : isLoading;
  const dataError = showRecommendations ? recommendationsError : error;

  if (isDataLoading) {
    return (
      <View className="py-16 items-center justify-center">
        <ActivityIndicator size="small" />
        <P className="mt-2 text-muted-foreground">
          {showRecommendations
            ? "Finding perfect recipes for you..."
            : "Loading recipes..."}
        </P>
      </View>
    );
  }

  if (dataError) {
    return (
      <View className="py-16 items-center justify-center">
        <P className="text-destructive text-center">{dataError.message}</P>
      </View>
    );
  }

  return (
    <Animated.FlatList
      numColumns={2}
      className="px-3 mt-6"
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      data={recipesToShow}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <RecipeItemCard key={item.id} recipe={item} />}
      ListEmptyComponent={
        <View className="py-16 items-center justify-center">
          <H4 className="text-muted-foreground font-urbanist-semibold text-center">
            {showRecommendations
              ? "No recipes can be made right now"
              : "No recipes found"}
          </H4>
          <P className="text-muted-foreground font-urbanist-regular text-center text-sm mt-1">
            {showRecommendations
              ? "Try adding more ingredients to your pantry"
              : "Try adjusting your filters or add some ingredients"}
          </P>
        </View>
      }
    />
  );
}
