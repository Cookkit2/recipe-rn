import React from "react";
import { View } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { H2, P } from "~/components/ui/typography";
import { PlusIcon } from "lucide-uniwind";
import EditStepItem from "./EditStepItem";
import type { RecipeStep } from "~/types/Recipe";

type StepsSectionProps = {
  steps: RecipeStep[];
  onAddStep: () => void;
  onChangeStep: (index: number, updatedStep: RecipeStep) => void;
  onRemoveStep: (index: number) => void;
};

export function StepsSection({ steps, onAddStep, onChangeStep, onRemoveStep }: StepsSectionProps) {
  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <H2>Steps</H2>
        <Button
          size="sm"
          variant="secondary"
          onPress={onAddStep}
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
              onChange={(updatedStep) => onChangeStep(index, updatedStep)}
              onDelete={() => onRemoveStep(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
