import React from "react";
import { View } from "react-native";
import { H1 } from "~/components/ui/typography";

export default function PrivacyScreen() {
  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 justify-center px-10 pb-10">
        <H1>Privacy Policy</H1>
      </View>
    </View>
  );
}
