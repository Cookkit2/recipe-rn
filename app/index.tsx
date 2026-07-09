import { Stack, useRouter, Redirect } from "expo-router";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import PantryWrapper from "~/components/Pantry/PantryWrapper";
import { PantryProvider } from "~/store/PantryContext";
import { RecipeProvider } from "~/store/RecipeContext";
import * as Haptics from "expo-haptics";
import { IS_E2E } from "~/utils/e2e-flags";
import { useFirstRunAha } from "~/hooks/useFirstRunAha";
import AhaScreen from "~/components/Onboarding/AhaScreen";

export default function PantryPage() {
  const router = useRouter();
  const onboardingCompleted = IS_E2E ? true : storage.get<boolean>(ONBOARDING_COMPLETED_KEY);

  // Dark-launched first-session "aha" surface (issue #720). ADDITIVE: only
  // renders when the `onboarding_aha` flag is enabled AND onboarding is done
  // AND the surface hasn't been seen. Flag defaults off (and off-while-loading),
  // so the existing home is unchanged unless explicitly enabled. E2E bypasses
  // it via IS_E2E short-circuit (the flag stays off in E2E builds).
  const { shouldShow: shouldShowAha } = useFirstRunAha();

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  if (shouldShowAha && !IS_E2E) {
    return (
      <RecipeProvider>
        <AhaScreen />
      </RecipeProvider>
    );
  }

  return (
    <>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Search"
          icon="magnifyingglass"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/search");
          }}
        />
        <Stack.Toolbar.Button
          accessibilityLabel="Add ingredient"
          icon={"plus"}
          separateBackground
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/ingredient/create");
          }}
        />

        <Stack.Toolbar.Button
          accessibilityLabel="Profile"
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
