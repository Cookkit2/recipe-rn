import React from "react";
import { View } from "react-native";
import IngredientHeaderRow from "./IngredientHeaderRow";
import CameraOnboardingSheet from "./CameraOnboardingSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CameraLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { bottom, top } = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-black"
      style={{ paddingTop: top, paddingBottom: bottom }}
    >
      <IngredientHeaderRow />
      {children}
      <CameraOnboardingSheet />
    </View>
  );
}
