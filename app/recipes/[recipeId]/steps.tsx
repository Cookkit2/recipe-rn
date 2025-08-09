import React from "react";
import { View } from "react-native";
import { H1 } from "~/components/ui/typography";

export default function RecipeSteps() {
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 bg-red-500">
        <H1>RecipeSteps</H1>
      </View>
    </View>
  );
}
