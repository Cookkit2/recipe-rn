import RecipeItemCard from "./RecipeItemCard";
import { useMemo } from "react";
import { Animated, View, ActivityIndicator } from "react-native";
import { useRecipeStore } from "~/store/RecipeContext";
import { H4, P } from "../ui/typography";
import { useRecipeRecommendations } from "~/hooks/queries/useRecipeQueries";

export default function RecipeLists() {
  const { selectedRecipeTags } = useRecipeStore();
  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useRecipeRecommendations({
    categories: selectedRecipeTags.length > 0 ? selectedRecipeTags : undefined,
    maxRecommendations: 8,
    preferCompleteable: false,
  });

  // Determine which recipes to show
  const recipesToShow = useMemo(() => {
    if (recommendations) {
      // Combine can make and partial recommendations
      const allRecommendations = [
        ...recommendations.canMakeRecommendations,
        ...recommendations.partialRecommendations.map((item) => item.recipe),
      ];
      return allRecommendations;
    }
  }, [recommendations]);

  if (recommendationsLoading) {
    return (
      <View className="py-16 items-center justify-center">
        <ActivityIndicator size="small" />
        <P className="mt-2 text-muted-foreground">Loading recipes...</P>
      </View>
    );
  }

  if (recommendationsError) {
    return (
      <View className="py-16 items-center justify-center">
        <P className="text-destructive text-center">
          {recommendationsError.message}
        </P>
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
            {recommendations
              ? "No recipes can be made right now"
              : "No recipes found"}
          </H4>
          <P className="text-muted-foreground font-urbanist-regular text-center text-sm mt-1">
            {recommendations
              ? "Try adding more ingredients to your pantry"
              : "Try adjusting your filters or add some ingredients"}
          </P>
        </View>
      }
    />
  );
}
