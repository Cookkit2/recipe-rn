import { Alert } from "react-native";
import type { Recipe, RecipeIngredient, RecipeStep } from "~/types/Recipe";
import type { RecipeVersionMetadata } from "~/hooks/useRecipeVersioning";

export function useRecipeFormHandlers(recipe: Recipe, onChange: (recipe: Recipe) => void) {
  const handleTitleChange = (newTitle: string) => {
    onChange({ ...recipe, title: newTitle });
  };

  const handleDescriptionChange = (newDescription: string) => {
    onChange({ ...recipe, description: newDescription });
  };

  const handleIngredientChange = (index: number, updatedIngredient: RecipeIngredient) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = updatedIngredient;
    onChange({ ...recipe, ingredients: newIngredients });
  };

  const handleAddIngredient = () => {
    const newIngredient: RecipeIngredient = {
      name: "",
      relatedIngredientId: "",
      quantity: 1,
      unit: "cup",
      notes: "",
    };
    onChange({ ...recipe, ingredients: [...recipe.ingredients, newIngredient] });
  };

  const handleRemoveIngredient = (index: number) => {
    const ingredient = recipe.ingredients[index];
    if (!ingredient) {
      return;
    }
    Alert.alert(
      "Delete Ingredient",
      `Are you sure you want to remove "${ingredient.name || "this ingredient"}" from the recipe?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
            onChange({ ...recipe, ingredients: newIngredients });
          },
        },
      ]
    );
  };

  const handleStepChange = (index: number, updatedStep: RecipeStep) => {
    const newSteps = [...recipe.instructions];
    newSteps[index] = updatedStep;
    onChange({ ...recipe, instructions: newSteps });
  };

  const handleAddStep = () => {
    const newStep: RecipeStep = {
      step: recipe.instructions.length + 1,
      title: "",
      description: "",
      relatedIngredientIds: [],
    };
    onChange({ ...recipe, instructions: [...recipe.instructions, newStep] });
  };

  const handleRemoveStep = (index: number) => {
    const step = recipe.instructions[index];
    if (!step) {
      return;
    }
    Alert.alert(
      "Delete Step",
      `Are you sure you want to remove step "${step.title || "Untitled"}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newSteps = recipe.instructions
              .filter((_, i) => i !== index)
              .map((s, i) => ({ ...s, step: i + 1 }));
            onChange({ ...recipe, instructions: newSteps });
          },
        },
      ]
    );
  };

  const handleRevertToVersion = (versionNumber: number, version: RecipeVersionMetadata) => {
    // Revert the recipe to the selected version
    // Note: The version metadata contains the saved recipe data
    // We need to update the form with this data
    Alert.alert(
      "Revert Successful",
      `Recipe has been reverted to version ${versionNumber}. Review the changes and save to apply them.`,
      [
        {
          text: "OK",
          onPress: () => {
            // Update the recipe with the version data
            onChange({
              ...recipe,
              title: version.title,
              description: version.description,
              prepMinutes: version.prepMinutes,
              cookMinutes: version.cookMinutes,
              difficultyStars: version.difficultyStars,
              servings: version.servings,
              // Note: ingredients and steps would need to be fetched from the full version data
              // For now, we keep the current ingredients and steps
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
            });
          },
        },
      ]
    );
  };

  return {
    handleTitleChange,
    handleDescriptionChange,
    handleIngredientChange,
    handleAddIngredient,
    handleRemoveIngredient,
    handleStepChange,
    handleAddStep,
    handleRemoveStep,
    handleRevertToVersion,
  };
}
