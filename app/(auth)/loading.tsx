import React from "react";
import { View } from "react-native";
import { Text } from "~/components/ui/text";
import { LoadingSpinner } from "~/components/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AuthLoadingScreen() {
  const { top: pt } = useSafeAreaInsets();

  return (
    <View
      className="flex-1 justify-center items-center bg-background px-6"
      style={{ paddingTop: pt }}
    >
      {/* App Logo Area */}
      <View className="items-center mb-12">
        <View className="w-24 h-24 bg-primary rounded-2xl items-center justify-center mb-4">
          <Text className="text-3xl font-bold text-primary-foreground">🍳</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground">Recipe</Text>
        <Text className="text-base text-muted-foreground">
          Your cooking companion
        </Text>
      </View>

      {/* Loading Indicator */}
      <View className="items-center space-y-4">
        <LoadingSpinner size="lg" />
        <Text className="text-base text-muted-foreground">
          Setting up your kitchen...
        </Text>
      </View>
    </View>
  );
}
