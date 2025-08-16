import React from "react";
import { View } from "react-native";
import type { RecipeStep } from "~/types/Recipe";
import { Text } from "~/components/ui/text";
import { H1, H2 } from "~/components/ui/typography";

const StepContent: React.FC<{ step: RecipeStep }> = ({ step }) => {
  return (
    <View className="flex-1 h-full bg-primary rounded-3xl border-continuous p-4">
      <View className="flex-1 bg-background rounded-lg border-continuous">
        <View className="absolute top-2 left-2 p-2 bg-primary rounded-lg border-continuous aspect-square">
          <H1 className="text-primary-foreground">{step.step}</H1>
        </View>
        <H2 className="text-center text-foreground py-4">{step.title}</H2>

        <View className="bg-background rounded-lg p-6 border-continuous">
          <Text className="text-base leading-7 text-foreground text-center">
            {step.description}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default StepContent;
