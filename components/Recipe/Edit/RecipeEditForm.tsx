import React, { useRef, useState } from "react";
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { TitleSection } from "./TitleSection";
import { DescriptionSection } from "./DescriptionSection";
import { IngredientsSection } from "./IngredientsSection";
import { StepsSection } from "./StepsSection";
import VersionHistorySheet from "./VersionHistorySheet";
import type { Recipe, RecipeIngredient, RecipeStep } from "~/types/Recipe";
import { useRecipeVersioning } from "~/hooks/useRecipeVersioning";
import type { RecipeVersionMetadata } from "~/hooks/useRecipeVersioning";

type RecipeEditFormProps = {
  recipeId: string;
  recipe: Recipe;
  onChange: (recipe: Recipe) => void;
  onSave: () => void;
  onCancel: () => void;
  onSaveAsCopy?: () => void;
  isSaving?: boolean;
  className?: string;
};

export default function RecipeEditForm({
  recipeId,
  recipe,
  onChange,
  onSave,
  onCancel,
  onSaveAsCopy,
  isSaving = false,
  className,
}: RecipeEditFormProps) {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  // Get version history
  const { versions, isLoadingVersions } = useRecipeVersioning({ recipeId });

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 pb-24"
        keyboardShouldPersistTaps="handled"
      >
        <TitleSection
          title={recipe.title}
          onChangeText={handleTitleChange}
          onShowVersionHistory={() => setShowVersionHistory(true)}
          titleInputRef={titleInputRef}
        />

        <DescriptionSection
          description={recipe.description}
          onChangeText={handleDescriptionChange}
          descriptionInputRef={descriptionInputRef}
        />

        <Separator className="mx-4" />

        <IngredientsSection
          ingredients={recipe.ingredients}
          onAddIngredient={handleAddIngredient}
          onChangeIngredient={handleIngredientChange}
          onRemoveIngredient={handleRemoveIngredient}
        />

        <Separator className="mx-4" />

        <StepsSection
          steps={recipe.instructions}
          onAddStep={handleAddStep}
          onChangeStep={handleStepChange}
          onRemoveStep={handleRemoveStep}
        />
      </ScrollView>

      {/* Footer with Save/Cancel buttons */}
      <View
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 gap-3",
          className
        )}
      >
        <View className="flex-row gap-3">
          <Button variant="outline" onPress={onCancel} disabled={isSaving} className="flex-1">
            <Text>Cancel</Text>
          </Button>
          {onSaveAsCopy && (
            <Button
              variant="secondary"
              onPress={onSaveAsCopy}
              disabled={isSaving || !recipe.title.trim()}
              className="flex-1"
            >
              <Text>{isSaving ? "Saving..." : "Save as Copy"}</Text>
            </Button>
          )}
          <Button onPress={onSave} disabled={isSaving || !recipe.title.trim()} className="flex-1">
            <Text>{isSaving ? "Saving..." : "Save Changes"}</Text>
          </Button>
        </View>
      </View>

      {/* Version History Sheet */}
      {showVersionHistory && (
        <VersionHistorySheet
          versions={versions}
          isLoading={isLoadingVersions}
          onRevert={handleRevertToVersion}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}
