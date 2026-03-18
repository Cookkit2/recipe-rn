import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { Collection } from "@nozbe/watermelondb";
import { database } from "~/data/db/database";
import type Recipe from "~/data/db/models/Recipe";
import type RecipeIngredient from "~/data/db/models/RecipeIngredient";
import type RecipeStep from "~/data/db/models/RecipeStep";
import { RecipeRepository } from "~/data/db/repositories/RecipeRepository";
import { log } from "~/utils/logger";

// Local interfaces for the working copy (not persisted to DB)
export interface EditableIngredient {
  id?: string; // undefined for new ingredients
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface EditableStep {
  id?: string; // undefined for new steps
  step: number;
  title: string;
  description: string;
}

export interface EditableRecipe {
  title: string;
  description: string;
  imageUrl?: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  tags?: string[];
  ingredients: EditableIngredient[];
  steps: EditableStep[];
}

export interface UseRecipeEditOptions {
  onSave?: () => void;
  onSaveAsCopy?: () => void;
  onCancel?: () => void;
}

async function updateRecipeDetails(recipe: Recipe, workingCopy: EditableRecipe) {
  await recipe.updateRecipe({
    title: workingCopy.title,
    description: workingCopy.description,
    imageUrl: workingCopy.imageUrl,
    prepMinutes: workingCopy.prepMinutes,
    cookMinutes: workingCopy.cookMinutes,
    difficultyStars: workingCopy.difficultyStars,
    servings: workingCopy.servings,
    tags: workingCopy.tags,
  });
}

async function syncRecipeIngredients(
  recipe: Recipe,
  workingCopy: EditableRecipe,
  ingredientsCollection: Collection<RecipeIngredient>
) {
  const batchOps: any[] = [];

  // Delete removed ingredients
  const existingIngredients = await recipe.ingredients.query().fetch();
  for (const existing of existingIngredients) {
    if (!workingCopy.ingredients.some((ing) => ing.id === existing.id)) {
      batchOps.push(existing.prepareDestroyPermanently());
    }
  }

  // Update or create ingredients
  for (const ingredient of workingCopy.ingredients) {
    if (ingredient.id) {
      // Update existing
      const existing = existingIngredients.find((ing) => ing.id === ingredient.id);
      if (existing) {
        batchOps.push(
          existing.prepareUpdate((ing: RecipeIngredient) => {
            ing.name = ingredient.name;
            ing.quantity = ingredient.quantity;
            ing.unit = ingredient.unit;
            ing.notes = ingredient.notes;
          })
        );
      }
    } else {
      // Create new
      batchOps.push(
        ingredientsCollection.prepareCreate((ing: RecipeIngredient) => {
          ing.recipeId = recipe.id;
          ing.name = ingredient.name;
          ing.quantity = ingredient.quantity;
          ing.unit = ingredient.unit;
          ing.notes = ingredient.notes;
        })
      );
    }
  }

  if (batchOps.length > 0) {
    await ingredientsCollection.database.batch(...batchOps);
  }
}

async function syncRecipeSteps(
  recipe: Recipe,
  workingCopy: EditableRecipe,
  stepsCollection: Collection<RecipeStep>
) {
  const batchOps: any[] = [];

  // Delete removed steps
  const existingSteps = await recipe.steps.query().fetch();
  for (const existing of existingSteps) {
    if (!workingCopy.steps.some((step) => step.id === existing.id)) {
      batchOps.push(existing.prepareDestroyPermanently());
    }
  }

  // Update or create steps
  for (const step of workingCopy.steps) {
    if (step.id) {
      // Update existing
      const existing = existingSteps.find((s) => s.id === step.id);
      if (existing) {
        batchOps.push(
          existing.prepareUpdate((s: RecipeStep) => {
            s.step = step.step;
            s.title = step.title;
            s.description = step.description;
          })
        );
      }
    } else {
      // Create new
      batchOps.push(
        stepsCollection.prepareCreate((s: RecipeStep) => {
          s.step = step.step;
          s.title = step.title;
          s.description = step.description;
          s.recipeId = recipe.id;
        })
      );
    }
  }

  if (batchOps.length > 0) {
    await stepsCollection.database.batch(...batchOps);
  }
}

export function useRecipeEdit(recipe: Recipe | null, options: UseRecipeEditOptions = {}) {
  const [isEditing, setIsEditing] = useState(false);
  const [workingCopy, setWorkingCopy] = useState<EditableRecipe | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const recipeRepository = new RecipeRepository();

  // Initialize working copy from recipe
  const startEdit = useCallback(async () => {
    if (!recipe) return;

    try {
      const recipeWithDetails = await recipeRepository.getRecipeWithDetails(recipe.id);

      if (!recipeWithDetails) {
        Alert.alert("Error", "Could not load recipe details");
        return;
      }

      const { recipe: r, ingredients, steps } = recipeWithDetails;

      setWorkingCopy({
        title: r.title,
        description: r.description,
        imageUrl: r.imageUrl,
        prepMinutes: r.prepMinutes,
        cookMinutes: r.cookMinutes,
        difficultyStars: r.difficultyStars,
        servings: r.servings,
        tags: r.tags,
        ingredients: ingredients.map(
          (ing): EditableIngredient => ({
            id: ing.id,
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
          })
        ),
        steps: steps
          .map(
            (s): EditableStep => ({
              id: s.id,
              step: s.step,
              title: s.title,
              description: s.description,
            })
          )
          .sort((a, b) => a.step - b.step),
      });

      setIsEditing(true);
      setHasUnsavedChanges(false);
    } catch (error) {
      log.error("Error starting edit:", error);
      Alert.alert("Error", "Could not start editing recipe");
    }
  }, [recipe]);

  // Update recipe basic fields
  const updateRecipeField = useCallback(
    <K extends keyof EditableRecipe>(field: K, value: EditableRecipe[K]) => {
      if (!workingCopy) return;

      setWorkingCopy((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, [field]: value };
        setHasUnsavedChanges(true);
        return updated;
      });
    },
    [workingCopy]
  );

  // Update an existing ingredient
  const updateIngredient = useCallback(
    (index: number, updates: Partial<EditableIngredient>) => {
      if (!workingCopy) return;

      setWorkingCopy((prev) => {
        if (!prev) return prev;
        const newIngredients = [...prev.ingredients];
        newIngredients[index] = { ...newIngredients[index], ...updates } as EditableIngredient;
        setHasUnsavedChanges(true);
        return { ...prev, ingredients: newIngredients };
      });
    },
    [workingCopy]
  );

  // Add a new ingredient
  const addIngredient = useCallback(() => {
    if (!workingCopy) return;

    setWorkingCopy((prev) => {
      if (!prev) return prev;
      setHasUnsavedChanges(true);
      return {
        ...prev,
        ingredients: [
          ...prev.ingredients,
          { name: "", quantity: 1, unit: "unit" } as EditableIngredient,
        ],
      };
    });
  }, [workingCopy]);

  // Remove an ingredient
  const removeIngredient = useCallback(
    (index: number) => {
      if (!workingCopy) return;

      setWorkingCopy((prev) => {
        if (!prev) return prev;
        const newIngredients = prev.ingredients.filter((_, i) => i !== index);
        setHasUnsavedChanges(true);
        return { ...prev, ingredients: newIngredients };
      });
    },
    [workingCopy]
  );

  // Update an existing step
  const updateStep = useCallback(
    (index: number, updates: Partial<EditableStep>) => {
      if (!workingCopy) return;

      setWorkingCopy((prev) => {
        if (!prev) return prev;
        const newSteps = [...prev.steps];
        newSteps[index] = { ...newSteps[index], ...updates } as EditableStep;
        setHasUnsavedChanges(true);
        return { ...prev, steps: newSteps };
      });
    },
    [workingCopy]
  );

  // Add a new step
  const addStep = useCallback(() => {
    if (!workingCopy) return;

    setWorkingCopy((prev) => {
      if (!prev) return prev;
      const newStepNumber = prev.steps.length + 1;
      setHasUnsavedChanges(true);
      return {
        ...prev,
        steps: [...prev.steps, { step: newStepNumber, title: "", description: "" } as EditableStep],
      };
    });
  }, [workingCopy]);

  // Remove a step and renumber remaining steps
  const removeStep = useCallback(
    (index: number) => {
      if (!workingCopy) return;

      setWorkingCopy((prev) => {
        if (!prev) return prev;
        const newSteps = prev.steps
          .filter((_, i) => i !== index)
          .map((step, i) => ({ ...step, step: i + 1 }));
        setHasUnsavedChanges(true);
        return { ...prev, steps: newSteps };
      });
    },
    [workingCopy]
  );

  // Reorder steps
  const reorderSteps = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!workingCopy || fromIndex === toIndex) return;

      setWorkingCopy((prev) => {
        if (!prev) return prev;
        const newSteps = [...prev.steps];
        const [movedStep] = newSteps.splice(fromIndex, 1);
        newSteps.splice(toIndex, 0, movedStep as EditableStep);

        // Renumber all steps
        const renumberedSteps = newSteps.map((step, i) => ({
          ...step,
          step: i + 1,
        }));

        setHasUnsavedChanges(true);
        return { ...prev, steps: renumberedSteps };
      });
    },
    [workingCopy]
  );

  // Save changes to the existing recipe
  const saveChanges = useCallback(async () => {
    if (!recipe || !workingCopy) return;

    try {
      await database.write(async () => {
        await updateRecipeDetails(recipe, workingCopy);

        const ingredientsCollection =
          database.collections.get<RecipeIngredient>("recipe_ingredient");
        await syncRecipeIngredients(recipe, workingCopy, ingredientsCollection);

        const stepsCollection = database.collections.get<RecipeStep>("recipe_step");
        await syncRecipeSteps(recipe, workingCopy, stepsCollection);
      });

      setIsEditing(false);
      setWorkingCopy(null);
      setHasUnsavedChanges(false);
      options.onSave?.();
    } catch (error) {
      log.error("Error saving recipe:", error);
      Alert.alert("Error", "Could not save recipe changes");
    }
  }, [recipe, workingCopy, options]);

  // Cancel editing and discard changes
  const cancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setIsEditing(false);
              setWorkingCopy(null);
              setHasUnsavedChanges(false);
              options.onCancel?.();
            },
          },
        ]
      );
    } else {
      setIsEditing(false);
      setWorkingCopy(null);
      options.onCancel?.();
    }
  }, [hasUnsavedChanges, options]);

  // Save as a new copy
  const saveAsCopy = useCallback(async () => {
    if (!workingCopy) return;

    try {
      await database.write(async () => {
        await recipeRepository.createRecipeWithDetails({
          recipe: {
            ...workingCopy,
            title: `${workingCopy.title} (Copy)`,
          },
          steps: workingCopy.steps.map((s) => ({
            step: s.step,
            title: s.title,
            description: s.description,
            recipeId: "", // Will be set by createRecipeWithDetails
          })),
          ingredients: workingCopy.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            notes: ing.notes,
            recipeId: "", // Will be set by createRecipeWithDetails
          })),
        });
      });

      setIsEditing(false);
      setWorkingCopy(null);
      setHasUnsavedChanges(false);
      options.onSaveAsCopy?.();
    } catch (error) {
      log.error("Error saving recipe as copy:", error);
      Alert.alert("Error", "Could not save recipe as copy");
    }
  }, [workingCopy, options]);

  return {
    isEditing,
    workingCopy,
    hasUnsavedChanges,
    startEdit,
    updateRecipeField,
    updateIngredient,
    addIngredient,
    removeIngredient,
    updateStep,
    addStep,
    removeStep,
    reorderSteps,
    saveChanges,
    cancelEdit,
    saveAsCopy,
  };
}
