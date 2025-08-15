import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useColors from "~/hooks/useColor";
import { Button } from "~/components/ui/button";
import { H1, H4, P } from "~/components/ui/typography";
import { Card } from "~/components/ui/card";

export default function OnboardingStep1() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const colors = useColors();

  const complete = () => {
    router.push("/onboarding/step2");
  };

  return (
    <View className="relative flex-1">
      <LinearGradient
        colors={[colors.border, colors.muted]}
        style={[StyleSheet.absoluteFill]}
      />
      <View
        className="flex flex-1"
        style={{ paddingTop: top, paddingBottom: bottom }}
      >
        <View className="flex-1 justify-center items-center"></View>
        <Card className="p-6 mx-6 rounded-3xl border-continuous">
          <H1 className="text-center">Snap Ingredients</H1>
          <P className="mt-4 text-foreground/80 px-4 text-center">
            Take a photo of your grocery list and we'll keep your ingredients
          </P>
        </Card>
      </View>
      <View className="px-6 pb-10">
        <Button
          size="lg"
          variant="outline"
          onPress={complete}
          className="mt-12 rounded-2xl"
        >
          <H4>Continue</H4>
        </Button>
      </View>
    </View>
  );
}
