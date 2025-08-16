import React, { useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getRecipeById } from "~/data/dummy-recipes";
import { RecipeStepsProvider } from "~/store/context/RecipeStepsContext";
import type { RecipeIngredient, RecipeStep } from "~/types/Recipe";
import StepBottomBar from "~/components/Recipe/Step/StepBottomBar";
import StepCarousel from "~/components/Recipe/Step/StepCarousel";
import StepHeaderBar from "~/components/Recipe/Step/StepHeaderBar";
import { H2 } from "~/components/ui/typography";

export type StepPageData = {
  type: "ingredients" | "step";
  step: number;
  content: RecipeIngredient[] | RecipeStep;
};

export default function RecipeSteps() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const recipe = useMemo(
    () => (typeof recipeId === "string" ? getRecipeById(recipeId) : undefined),
    [recipeId]
  );

  const stepPages = useMemo((): StepPageData[] => {
    if (!recipe) return [];

    const pages: StepPageData[] = [
      {
        type: "ingredients",
        step: 0,
        content: recipe.ingredients,
      },
    ];

    recipe.instructions.forEach((step) => {
      pages.push({
        type: "step",
        step: step.step,
        content: step,
      });
    });

    return pages;
  }, [recipe]);

  if (!recipe || stepPages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <H2 className="text-center">Recipe not found</H2>
      </View>
    );
  }

  return (
    <RecipeStepsProvider stepPages={stepPages}>
      <View className="flex-1 bg-background">
        <StepHeaderBar />
        <StepCarousel />
        <StepBottomBar />
      </View>
    </RecipeStepsProvider>
  );
}
