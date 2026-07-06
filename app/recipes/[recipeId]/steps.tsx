import React, { useEffect, useMemo, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
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
import { useTailoredRecipe } from "~/hooks/useTailoredRecipe";
import { useRecipeStepPages, type StepPageData } from "~/hooks/useRecipeStepPages";
import AddTimerDialog from "~/components/Timer/AddTimerDialog";

export default function RecipeSteps() {
  const { recipeId, tailored, tailoredId } = useLocalSearchParams<{
    recipeId: string;
    tailored?: string;
    tailoredId?: string;
  }>();
  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const isTailored = tailored === "1";
  const { tailoredRecipe } = useTailoredRecipe(isTailored, tailoredId, recipeId, recipe);
  const [isAddTimerDialogOpen, setIsAddTimerDialogOpen] = useState(false);

  // Keep the display awake while the cook is actively on this screen.
  // useKeepAwake activates on mount and releases on unmount, so the screen
  // only stays awake on the cooking surface (not pantry/profile/etc).
  useKeepAwake("cooking-screen");

  const activeRecipe = tailoredRecipe || recipe;

  useEffect(() => {
    setStatusBarStyle("auto", true);
  }, []);

  const stepPages = useRecipeStepPages(activeRecipe);

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
