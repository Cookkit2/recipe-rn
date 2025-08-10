import React from "react";
import { View } from "react-native";
import type { RecipeStep } from "~/data/dummy-recipes";
import { Text } from "~/components/ui/text";

const StepContent: React.FC<{ step: RecipeStep }> = ({ step }) => {
  return (
    <View className="w-full">
      <View className="bg-blue-50 rounded-lg p-6">
        <Text className="text-base leading-7 text-foreground text-center">
          {step.description}
        </Text>
      </View>
    </View>
  );
};

export default StepContent;
