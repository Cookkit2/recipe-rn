import React from "react";
import { View } from "react-native";
import { Text } from "~/components/ui/text";

export default function RecipesIndex() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-2xl font-bold text-foreground">Recipes</Text>
      <Text className="text-muted-foreground mt-2">
        Browse and discover recipes here.
      </Text>
    </View>
  );
}
