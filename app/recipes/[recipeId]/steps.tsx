import React, { useMemo } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { RecipeStepsProvider } from "~/store/RecipeStepsContext";
import type { RecipeIngredient, RecipeStep } from "~/types/Recipe";
import StepBottomBar from "~/components/Recipe/Step/StepBottomBar";
import StepCarousel from "~/components/Recipe/Step/StepCarousel";
import StepHeaderBar from "~/components/Recipe/Step/StepHeaderBar";
import { H1, P } from "~/components/ui/typography";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";

export type StepPageData = {
  type: "ingredients" | "step" | "congratulations";
  step: number;
  content: RecipeIngredient[] | RecipeStep | null;
};

export default function RecipeSteps() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const { data: recipe, isLoading, error } = useRecipe(recipeId);

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

    // Lastly push a congratulation page
    pages.push({
      type: "congratulations",
      step: recipe.instructions.length + 1,
      content: null,
    });

    return pages;
  }, [recipe]);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading recipe steps...</P>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  // Recipe not found or no steps
  if (!recipe || stepPages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <H1 className="text-center">Recipe not found</H1>
        <P className="mt-2 text-muted-foreground text-center">
          Unable to load recipe steps.
        </P>
      </View>
    );
  }

  return (
    <RecipeStepsProvider stepPages={stepPages} recipe={recipe}>
      <View className="flex-1 bg-background">
        <StepHeaderBar />
        <StepCarousel />
        <StepBottomBar />
      </View>
    </RecipeStepsProvider>
  );
}
