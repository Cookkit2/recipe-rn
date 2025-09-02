import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "~/components/Shared/Header";
import DietarySection from "~/components/Preferences/DietarySection";

export default function DietScreen() {
  const { bottom } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: bottom }}>
      <Header title="Dietary Preference" />
      <DietarySection />
    </View>
  );
}
