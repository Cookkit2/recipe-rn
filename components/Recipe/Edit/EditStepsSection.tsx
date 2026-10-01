import React from "react";
import { View, Alert } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H2, P } from "~/components/ui/typography";
import { PlusIcon } from "lucide-uniwind";
import EditStepItem from "./EditStepItem";
import type { RecipeStep } from "~/types/Recipe";

type EditStepsSectionProps = {
  steps: RecipeStep[];
  onChange: (steps: RecipeStep[]) => void;
};

export default function EditStepsSection({ steps, onChange }: EditStepsSectionProps) {
  const handleStepChange = (index: number, updatedStep: RecipeStep) => {
    const newSteps = [...steps];
    newSteps[index] = updatedStep;
    onChange(newSteps);
  };

  const handleAddStep = () => {
    const newStep: RecipeStep = {
      step: steps.length + 1,
      title: "",
      description: "",
      relatedIngredientIds: [],
    };
    onChange([...steps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const step = steps[index];
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
            const newSteps = steps
              .filter((_, i) => i !== index)
              .map((s, i) => ({ ...s, step: i + 1 }));
            onChange(newSteps);
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

      {steps.length === 0 ? (
        <View className="py-8 items-center justify-center">
          <P className="text-muted-foreground text-center">
            No steps yet. Tap "Add Step" to get started.
          </P>
        </View>
      ) : (
        <View className="gap-3">
          {steps.map((step, index) => (
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
