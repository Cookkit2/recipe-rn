import React from "react";
import RecipeItemCard from "./RecipeItemCard";
import { Animated } from "react-native";
import { dummyRecipesData } from "~/data/dummy-recipes";
import { useRecipeStore } from "~/store/RecipeContext";

export default function RecipeLists() {
  const { filteredRecipes } = useRecipeStore();

  return (
    <Animated.FlatList
      numColumns={2}
      className="px-3 mt-6"
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      data={dummyRecipesData}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <RecipeItemCard key={item.id} recipe={item} />}
    />
  );
}
