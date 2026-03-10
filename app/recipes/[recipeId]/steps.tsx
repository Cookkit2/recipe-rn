import React, { useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { RecipeStepsProvider } from "~/store/RecipeStepsContext";
import type { RecipeIngredient, RecipeStep } from "~/types/Recipe";
import StepBottomBar from "~/components/Recipe/Step/StepBottomBar";
import StepCarousel from "~/components/Recipe/Step/StepCarousel";
import StepHeaderBar from "~/components/Recipe/Step/StepHeaderBar";
import { H1, P } from "~/components/ui/typography";
import { useRecipe } from "~/hooks/queries/useRecipeQueries";
import { setStatusBarStyle } from "expo-status-bar";
import type { Recipe } from "~/types/Recipe";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import { AddTimerDialog } from "~/components/Timer/AddTimerDialog";

export type StepPageData = {
  type: "ingredients" | "step" | "congratulations";
  step: number;
  content: RecipeIngredient[] | RecipeStep | null;
};

export default function RecipeSteps() {
  const { recipeId, tailored, tailoredId } = useLocalSearchParams<{
    recipeId: string;
    tailored?: string;
    tailoredId?: string;
  }>();
  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const isTailored = tailored === "1";
  const [tailoredRecipe, setTailoredRecipe] = React.useState<Recipe | null>(null);
  const [isAddTimerDialogOpen, setIsAddTimerDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTailoredRecipe = async () => {
      if (!isTailored || !recipeId) {
        if (isMounted) setTailoredRecipe(null);
        return;
      }
      if (!tailoredId) {
        if (isMounted) setTailoredRecipe(null);
        return;
      }

      const tailoredDetails = await databaseFacade.getTailoredRecipeWithDetails(tailoredId);

      if (!isMounted) return;
      if (!tailoredDetails) {
        setTailoredRecipe(null);
        return;
      }

      const baseRecipe = recipe;
      const mapped: Recipe = {
        id: tailoredDetails.recipe.id,
        title: tailoredDetails.recipe.title,
        description: tailoredDetails.recipe.description,
        imageUrl: tailoredDetails.recipe.imageUrl || baseRecipe?.imageUrl || "",
        prepMinutes: tailoredDetails.recipe.prepMinutes,
        cookMinutes: tailoredDetails.recipe.cookMinutes,
        difficultyStars: tailoredDetails.recipe.difficultyStars,
        servings: tailoredDetails.recipe.servings,
        calories: tailoredDetails.recipe.calories ?? baseRecipe?.calories,
        tags: tailoredDetails.recipe.tags || baseRecipe?.tags,
        ingredients: tailoredDetails.ingredients.map((ing, index) => ({
          name: ing.name,
          relatedIngredientId: `tailored-${tailoredDetails.recipe.id}-${index + 1}`,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
        instructions: tailoredDetails.steps.map((step) => ({
          step: step.step,
          title: step.title,
          description: step.description,
          relatedIngredientIds: [],
        })),
        sourceUrl: baseRecipe?.sourceUrl,
      };

      setTailoredRecipe(mapped);
    };

    loadTailoredRecipe();

    return () => {
      isMounted = false;
    };
  }, [isTailored, tailoredId, recipeId, recipe]);

  const activeRecipe = tailoredRecipe || recipe;

  useEffect(() => {
    setStatusBarStyle("auto", true);
  }, []);

  const stepPages = useMemo((): StepPageData[] => {
    if (!activeRecipe) return [];

    const pages: StepPageData[] = [
      {
        type: "ingredients",
        step: 0,
        content: activeRecipe.ingredients,
      },
    ];

    activeRecipe.instructions.forEach((step) => {
      pages.push({
        type: "step",
        step: step.step,
        content: step,
      });
    });

    // Lastly push a congratulation page
    pages.push({
      type: "congratulations",
      step: activeRecipe.instructions.length + 1,
      content: null,
    });

    return pages;
  }, [activeRecipe]);

  // Loading state
  if (isLoading && !tailoredRecipe) {
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
  if (!activeRecipe || stepPages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <H1 className="text-center">Recipe not found</H1>
        <P className="mt-2 text-muted-foreground text-center">Unable to load recipe steps.</P>
      </View>
    );
  }

  return (
    <RecipeStepsProvider stepPages={stepPages} recipe={activeRecipe} baseRecipeId={recipeId}>
      <View className="flex-1 bg-background">
        <StepHeaderBar />
        <StepCarousel
          recipeId={recipeId}
          onOpenAddTimerDialog={() => setIsAddTimerDialogOpen(true)}
        />
        <StepBottomBar />
        {/* <AddTimerDialog
          open={isAddTimerDialogOpen}
          onOpenChange={setIsAddTimerDialogOpen}
          recipeId={recipeId}
        /> */}
      </View>
    </RecipeStepsProvider>
  );
}
