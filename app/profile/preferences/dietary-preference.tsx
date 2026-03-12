import React from "react";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DietarySection from "~/components/Preferences/DietarySection";

export default function DietScreen() {
  const { bottom } = useSafeAreaInsets();

  return (
    <Animated.ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-background"
      contentContainerStyle={{ paddingBottom: bottom }}
    >
      <DietarySection />
    </Animated.ScrollView>
  );
}
