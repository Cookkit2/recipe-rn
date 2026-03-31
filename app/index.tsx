import { Stack, useRouter } from "expo-router";
import React from "react";
import { Redirect } from "expo-router";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import PantryWrapper from "~/components/Pantry/PantryWrapper";
import { PantryProvider } from "~/store/PantryContext";
import { RecipeProvider } from "~/store/RecipeContext";
import * as Haptics from "expo-haptics";

export default function PantryPage() {
  const router = useRouter();
  const onboardingCompleted = storage.get<boolean>(ONBOARDING_COMPLETED_KEY);

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="magnifyingglass"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/search");
          }}
        />
        <Stack.Toolbar.Button
          icon={"plus"}
          separateBackground
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/ingredient/create");
          }}
        />

        <Stack.Toolbar.Button
          icon="heart"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/recipes/favorites");
          }}
        />

        <Stack.Toolbar.Button
          icon="person"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/profile");
          }}
        />
      </Stack.Toolbar>
      <PantryProvider>
        <RecipeProvider>
          <PantryWrapper />
        </RecipeProvider>
      </PantryProvider>
    </>
  );
}
