import RecipeItemCard from "./RecipeItemCard";
import { useMemo } from "react";
import { Animated, View, ActivityIndicator } from "react-native";
import { useRecipeStore } from "~/store/RecipeContext";
import { H4, P } from "~/components/ui/typography";
import { useRecipeRecommendations } from "~/hooks/queries/useRecipeQueries";

export default function RecipeLists() {
  const { selectedRecipeTags } = useRecipeStore();

  // Enhanced options for recipe recommendations
  const recommendationOptions = useMemo(
    () => ({
      categories:
        selectedRecipeTags.length > 0 ? selectedRecipeTags : undefined,
      maxRecommendations: 8,
      preferCompleteable: false,
      respectDietaryPreferences: true, // Enable dietary filtering
    }),
    [selectedRecipeTags]
  );

  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useRecipeRecommendations(recommendationOptions);

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
    return [];
  }, [recommendations]);

  // TODO: Use random recipe recommendation 
  // Need to account for cooked recipe and the cooking utensils
  const fourRecipesToShow = recipesToShow.slice(0, 4);

  // Create display text for selected categories
  const selectedCategoriesText = useMemo(() => {
    if (selectedRecipeTags.length === 0) return "";

    const categoryLabels = {
      meal: "Meals",
      drink: "Drinks",
      dessert: "Desserts",
    };

    return selectedRecipeTags
      .map((tag) => categoryLabels[tag as keyof typeof categoryLabels] || tag)
      .join(", ");
  }, [selectedRecipeTags]);

  if (recommendationsLoading) {
    return (
      <View className="py-16 items-center justify-center">
        <ActivityIndicator size="small" />
        <P className="mt-2 text-muted-foreground">
          {selectedRecipeTags.length > 0
            ? `Loading ${selectedCategoriesText.toLowerCase()}...`
            : "Loading recipes..."}
        </P>
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
      data={fourRecipesToShow} // Limit to 4 recipes
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <RecipeItemCard key={item.id} recipe={item} />}
      ListEmptyComponent={
        <View className="py-16 items-center justify-center">
          <H4 className="text-muted-foreground font-urbanist-semibold text-center">
            {selectedRecipeTags.length > 0
              ? `No ${selectedCategoriesText.toLowerCase()} available`
              : "No recipes available"}
          </H4>
          <P className="text-muted-foreground font-urbanist-regular text-center text-sm mt-1">
            {selectedRecipeTags.length > 0
              ? `Try adding more ingredients for ${selectedCategoriesText.toLowerCase()} or select different categories`
              : "Try adding more ingredients to your pantry or adjust your dietary preferences"}
          </P>
        </View>
      }
    />
  );
}
