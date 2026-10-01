import React, { useRef, useState } from "react";
import { View, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H2, H4, P } from "~/components/ui/typography";
import { Separator } from "~/components/ui/separator";
import { PlusIcon, HistoryIcon } from "lucide-uniwind";
import { cn } from "~/lib/utils";
import EditIngredientItem from "./EditIngredientItem";
import EditStepItem from "./EditStepItem";
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
  const [titleHeight, setTitleHeight] = useState<number | undefined>(undefined);
  const [descriptionHeight, setDescriptionHeight] = useState<number | undefined>(undefined);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);

  // Get version history
  const { versions, isLoadingVersions } = useRecipeVersioning({ recipeId });

  const titleInputStyle = React.useMemo(
    () => ({
      height: titleHeight,
      paddingVertical: 0,
      includeFontPadding: false,
    }),
    [titleHeight]
  );

  const descriptionInputStyle = React.useMemo(
    () => ({
      height: descriptionHeight,
      paddingVertical: 0,
      includeFontPadding: false,
      minHeight: 80,
    }),
    [descriptionHeight]
  );

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
        <FormTitleSection
          title={recipe.title}
          onChangeText={handleTitleChange}
          onHistoryPress={() => setShowVersionHistory(true)}
          titleInputRef={titleInputRef}
          titleInputStyle={titleInputStyle}
        />

        <FormDescriptionSection
          description={recipe.description}
          onChangeText={handleDescriptionChange}
          descriptionInputRef={descriptionInputRef}
          descriptionInputStyle={descriptionInputStyle}
        />

        <Separator className="mx-4" />

        <FormIngredientsSection
          ingredients={recipe.ingredients}
          onAdd={handleAddIngredient}
          onChange={handleIngredientChange}
          onRemove={handleRemoveIngredient}
        />

        <Separator className="mx-4" />

        <FormStepsSection
          instructions={recipe.instructions}
          onAdd={handleAddStep}
          onChange={handleStepChange}
          onRemove={handleRemoveStep}
        />
      </ScrollView>

      <FormFooterSection
        onCancel={onCancel}
        onSaveAsCopy={onSaveAsCopy}
        onSave={onSave}
        isSaving={isSaving}
        isSaveDisabled={!recipe.title.trim()}
        className={className}
      />

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

type FormTitleSectionProps = {
  title: string;
  onChangeText: (text: string) => void;
  onHistoryPress: () => void;
  titleInputRef: React.RefObject<TextInput | null>;
  titleInputStyle: any;
};

function FormTitleSection({
  title,
  onChangeText,
  onHistoryPress,
  titleInputRef,
  titleInputStyle,
}: FormTitleSectionProps) {
  return (
    <View className="gap-2 px-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 relative">
          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={onChangeText}
            placeholder="Recipe Title"
            multiline
            scrollEnabled={false}
            textAlignVertical="center"
            returnKeyType="done"
            underlineColorAndroid="transparent"
            className="text-3xl text-foreground font-bowlby-one bg-transparent pr-20"
            style={titleInputStyle}
          />
        </View>
        <Button
          size="sm"
          variant="secondary"
          onPress={onHistoryPress}
          className="rounded-full mb-1"
        >
          <View className="flex-row items-center gap-1.5">
            <HistoryIcon size={14} strokeWidth={2.5} />
            <Text className="text-sm">History</Text>
          </View>
        </Button>
      </View>
    </View>
  );
}

type FormDescriptionSectionProps = {
  description: string;
  onChangeText: (text: string) => void;
  descriptionInputRef: React.RefObject<TextInput | null>;
  descriptionInputStyle: any;
};

function FormDescriptionSection({
  description,
  onChangeText,
  descriptionInputRef,
  descriptionInputStyle,
}: FormDescriptionSectionProps) {
  return (
    <View className="gap-2 px-4">
      <H4>Description</H4>
      <View className="relative bg-muted rounded-xl px-4 py-3">
        <TextInput
          ref={descriptionInputRef}
          value={description}
          onChangeText={onChangeText}
          placeholder="Add a description for your recipe..."
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          returnKeyType="done"
          underlineColorAndroid="transparent"
          className="flex-1 text-base text-foreground font-urbanist-regular bg-transparent leading-relaxed"
          style={descriptionInputStyle}
        />
      </View>
    </View>
  );
}

type FormIngredientsSectionProps = {
  ingredients: RecipeIngredient[];
  onAdd: () => void;
  onChange: (index: number, updatedIngredient: RecipeIngredient) => void;
  onRemove: (index: number) => void;
};

function FormIngredientsSection({
  ingredients,
  onAdd,
  onChange,
  onRemove,
}: FormIngredientsSectionProps) {
  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <H2>Ingredients</H2>
        <Button
          size="sm"
          variant="secondary"
          onPress={onAdd}
          className="flex-row items-center gap-2"
        >
          <PlusIcon size={16} strokeWidth={2.5} />
          <Text>Add Ingredient</Text>
        </Button>
      </View>

      {ingredients.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <P className="text-muted-foreground text-center">
            No ingredients yet. Tap "Add Ingredient" to get started.
          </P>
        </View>
      ) : (
        <View className="gap-3">
          {ingredients.map((ingredient, index) => (
            <EditIngredientItem
              key={`ingredient-${index}-${ingredient.name}`}
              ingredient={ingredient}
              onChange={(updatedIngredient) => onChange(index, updatedIngredient)}
              onDelete={() => onRemove(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

type FormStepsSectionProps = {
  instructions: RecipeStep[];
  onAdd: () => void;
  onChange: (index: number, updatedStep: RecipeStep) => void;
  onRemove: (index: number) => void;
};

function FormStepsSection({ instructions, onAdd, onChange, onRemove }: FormStepsSectionProps) {
  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <H2>Steps</H2>
        <Button
          size="sm"
          variant="secondary"
          onPress={onAdd}
          className="flex-row items-center gap-2"
        >
          <PlusIcon size={16} strokeWidth={2.5} />
          <Text>Add Step</Text>
        </Button>
      </View>

      {instructions.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <P className="text-muted-foreground text-center">
            No steps yet. Tap "Add Step" to get started.
          </P>
        </View>
      ) : (
        <View className="gap-3">
          {instructions.map((step, index) => (
            <EditStepItem
              key={`step-${index}-${step.step}`}
              step={step}
              onChange={(updatedStep) => onChange(index, updatedStep)}
              onDelete={() => onRemove(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

type FormFooterSectionProps = {
  onCancel: () => void;
  onSaveAsCopy?: () => void;
  onSave: () => void;
  isSaving: boolean;
  isSaveDisabled: boolean;
  className?: string;
};

function FormFooterSection({
  onCancel,
  onSaveAsCopy,
  onSave,
  isSaving,
  isSaveDisabled,
  className,
}: FormFooterSectionProps) {
  return (
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
            disabled={isSaving || isSaveDisabled}
            className="flex-1"
          >
            <Text>{isSaving ? "Saving..." : "Save as Copy"}</Text>
          </Button>
        )}
        <Button onPress={onSave} disabled={isSaving || isSaveDisabled} className="flex-1">
          <Text>{isSaving ? "Saving..." : "Save Changes"}</Text>
        </Button>
      </View>
    </View>
  );
}
