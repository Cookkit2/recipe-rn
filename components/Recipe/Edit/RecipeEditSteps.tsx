import React from "react";
import { View, Alert } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H2, P } from "~/components/ui/typography";
import { PlusIcon } from "lucide-uniwind";
import EditStepItem from "./EditStepItem";
import type { Recipe, RecipeStep } from "~/types/Recipe";

type Props = {
  recipe: Recipe;
  onChange: (recipe: Recipe) => void;
};

export default function RecipeEditSteps({ recipe, onChange }: Props) {
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

  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <H2>Steps</H2>
        <Button
          size="sm"
          variant="secondary"
          onPress={handleAddStep}
          className="flex-row items-center gap-2"
        >
          <PlusIcon size={16} strokeWidth={2.5} />
          <Text>Add Step</Text>
        </Button>
      </View>

      {recipe.instructions.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <P className="text-muted-foreground text-center">
            No steps yet. Tap "Add Step" to get started.
          </P>
        </View>
      ) : (
        <View className="gap-3">
          {recipe.instructions.map((step, index) => (
            <EditStepItem
              key={`step-${index}-${step.step}`}
              step={step}
              onChange={(updatedStep) => handleStepChange(index, updatedStep)}
              onDelete={() => handleRemoveStep(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
