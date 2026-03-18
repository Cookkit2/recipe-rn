import { useLocalSearchParams, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { H1, P } from "~/components/ui/typography";
import { setStatusBarStyle } from "expo-status-bar";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type RecipeIngredientModel from "~/data/db/models/RecipeIngredient";
import type RecipeStepModel from "~/data/db/models/RecipeStep";
import type { Recipe as DbRecipe } from "~/data/db/models";
import type { EditableRecipe } from "~/hooks/useRecipeEdit";
import { log } from "~/utils/logger";
import RecipeEditForm from "~/components/Recipe/Edit/RecipeEditForm";
import type { Recipe } from "~/types/Recipe";

// Convert Recipe type to EditableRecipe
function toEditableRecipe(recipe: Recipe): EditableRecipe {
  return {
    title: recipe.title,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    prepMinutes: recipe.prepMinutes || 0,
    cookMinutes: recipe.cookMinutes || 0,
    difficultyStars: recipe.difficultyStars || 0,
    servings: recipe.servings || 1,
    tags: recipe.tags,
    ingredients: recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: ing.notes,
    })),
    steps: recipe.instructions.map((step) => ({
      step: step.step,
      title: step.title,
      description: step.description,
    })),
  };
}

export default function RecipeEdit() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const [dbRecipe, setDbRecipe] = useState<DbRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [localRecipe, setLocalRecipe] = useState<Recipe | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch the WatermelonDB Recipe model
  useEffect(() => {
    async function fetchRecipe() {
      if (!recipeId) return;

      setIsLoading(true);
      setError(null);
      try {
        const recipe = await databaseFacade?.getRecipeById(recipeId);
        if (recipe) {
          setDbRecipe(recipe);

          // Also fetch the UI recipe format for the form
          const recipeWithDetails = await databaseFacade.getRecipeWithDetails(recipeId);
          if (recipeWithDetails) {
            const { recipe: r, ingredients, steps } = recipeWithDetails;
            setLocalRecipe({
              id: r.id,
              title: r.title,
              description: r.description,
              imageUrl: r.imageUrl || "",
              prepMinutes: r.prepMinutes,
              cookMinutes: r.cookMinutes,
              difficultyStars: r.difficultyStars,
              servings: r.servings,
              sourceUrl: r.sourceUrl,
              calories: r.calories,
              tags: r.tags,
              ingredients: ingredients.map((ing) => ({
                name: ing.name,
                relatedIngredientId: "",
                quantity: ing.quantity,
                unit: ing.unit,
                notes: ing.notes,
              })),
              instructions: steps.map((s) => ({
                step: s.step,
                title: s.title,
                description: s.description,
                relatedIngredientIds: [],
              })),
            });
          }
        } else {
          setError(new Error("Recipe not found"));
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecipe();
  }, [recipeId]);

  useEffect(() => {
    setStatusBarStyle("light", true);
    return () => setStatusBarStyle("auto", true);
  }, []);

  const handleRecipeChange = (updatedRecipe: Recipe) => {
    setLocalRecipe(updatedRecipe);
  };

  const handleSave = async () => {
    if (!localRecipe || !dbRecipe) return;

    if (!localRecipe.title.trim()) {
      Alert.alert("Validation Error", "Recipe title cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      // Convert to EditableRecipe format for the hook
      const editable = toEditableRecipe(localRecipe);

      // Manually update the database using the edit hook's approach
      const { database } = await import("~/data/db/database");

      await database.write(async () => {
        const batchOperations: any[] = [];

        // Prepare recipe update
        batchOperations.push(
          dbRecipe.prepareUpdate((recipe) => {
            if (editable.title !== undefined) recipe.title = editable.title;
            if (editable.description !== undefined) recipe.description = editable.description;
            if (editable.imageUrl !== undefined) recipe.imageUrl = editable.imageUrl;
            if (editable.prepMinutes !== undefined) recipe.prepMinutes = editable.prepMinutes;
            if (editable.cookMinutes !== undefined) recipe.cookMinutes = editable.cookMinutes;
            if (editable.difficultyStars !== undefined)
              recipe.difficultyStars = editable.difficultyStars;
            if (editable.servings !== undefined) recipe.servings = editable.servings;
            if (editable.tags !== undefined) recipe.tags = editable.tags;
          })
        );

        // Handle ingredients
        const ingredientsCollection =
          database.collections.get<RecipeIngredientModel>("recipe_ingredient");

        const existingIngredients = await dbRecipe.ingredients.fetch();
        const existingIngredientsMap = new Map(
          existingIngredients.map((ing: RecipeIngredientModel) => [ing.id, ing])
        );

        // Delete removed ingredients
        for (const existing of existingIngredients) {
          if (!editable.ingredients.some((ing: any) => ing.id === existing.id)) {
            batchOperations.push(existing.prepareDestroyPermanently());
          }
        }

        // Update or create ingredients
        for (const ingredient of editable.ingredients) {
          if (ingredient.id) {
            const existing = existingIngredientsMap.get(ingredient.id);
            if (existing) {
              batchOperations.push(
                existing.prepareUpdate((ing) => {
                  if (ingredient.name !== undefined) ing.name = ingredient.name;
                  if (ingredient.quantity !== undefined) ing.quantity = ingredient.quantity;
                  if (ingredient.unit !== undefined) ing.unit = ingredient.unit;
                  if (ingredient.notes !== undefined) ing.notes = ingredient.notes;
                })
              );
            }
          } else {
            batchOperations.push(
              ingredientsCollection.prepareCreate((ing) => {
                ing.recipeId = dbRecipe.id;
                ing.name = ingredient.name;
                if (ingredient.quantity !== undefined) ing.quantity = ingredient.quantity;
                if (ingredient.unit !== undefined) ing.unit = ingredient.unit;
                if (ingredient.notes !== undefined) ing.notes = ingredient.notes;
              })
            );
          }
        }

        // Handle steps
        const stepsCollection = database.collections.get<RecipeStepModel>("recipe_step");

        const existingSteps = await dbRecipe.steps.fetch();
        const existingStepsMap = new Map(
          existingSteps.map((step: RecipeStepModel) => [step.id, step])
        );

        // Delete removed steps
        for (const existing of existingSteps) {
          if (!editable.steps.some((step: any) => step.id === existing.id)) {
            batchOperations.push(existing.prepareDestroyPermanently());
          }
        }

        // Update or create steps
        for (const step of editable.steps) {
          if (step.id) {
            const existing = existingStepsMap.get(step.id);
            if (existing) {
              batchOperations.push(
                existing.prepareUpdate((s) => {
                  if (step.step !== undefined) s.step = step.step;
                  if (step.title !== undefined) s.title = step.title;
                  if (step.description !== undefined) s.description = step.description;
                })
              );
            }
          } else {
            batchOperations.push(
              stepsCollection.prepareCreate((s) => {
                s.step = step.step;
                s.title = step.title;
                if (step.description !== undefined) s.description = step.description;
                s.recipeId = dbRecipe.id;
              })
            );
          }
        }

        await database.batch(...batchOperations);
      });

      router.back();
    } catch (err) {
      log.error("Error saving recipe:", err);
      Alert.alert("Save Failed", "Could not save the recipe. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSaveAsCopy = async () => {
    if (!localRecipe || !dbRecipe) return;

    if (!localRecipe.title.trim()) {
      Alert.alert("Validation Error", "Recipe title cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      // Import RecipeRepository
      const { RecipeRepository } = await import("~/data/db/repositories/RecipeRepository");
      const recipeRepository = new RecipeRepository();

      // Create a new recipe with the edited data
      const newRecipe = await recipeRepository.duplicateRecipe(dbRecipe.id, {
        recipe: {
          title: localRecipe.title,
          description: localRecipe.description,
          imageUrl: localRecipe.imageUrl,
          prepMinutes: localRecipe.prepMinutes || 0,
          cookMinutes: localRecipe.cookMinutes || 0,
          difficultyStars: localRecipe.difficultyStars || 0,
          servings: localRecipe.servings || 1,
          tags: localRecipe.tags,
        },
      });

      // Navigate to the new recipe
      router.replace(`/recipes/[recipeId]?recipeId=${newRecipe.id}`);
    } catch (err) {
      log.error("Error saving copy:", err);
      Alert.alert("Save Failed", "Could not save recipe as copy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <P className="mt-4 text-muted-foreground">Loading recipe...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <P className="text-destructive text-center">{error.message}</P>
      </View>
    );
  }

  if (!localRecipe) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <H1 className="text-center">Recipe not found</H1>
        <P className="mt-2 text-muted-foreground text-center">
          The recipe you're trying to edit doesn't exist.
        </P>
      </View>
    );
  }

  return (
    <RecipeEditForm
      recipeId={recipeId}
      recipe={localRecipe}
      onChange={handleRecipeChange}
      onSave={handleSave}
      onCancel={handleCancel}
      onSaveAsCopy={handleSaveAsCopy}
      isSaving={isSaving}
    />
  );
}
