import { Redirect } from "expo-router";
import { lazy, Suspense } from "react";
import { View } from "react-native";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import PantryHome from "~/components/Pantry/PantryHome";
import { PantryProvider } from "~/store/PantryContext";
import { RecipeProvider } from "~/store/RecipeContext";
import { IS_E2E } from "~/utils/e2e-flags";
import { useFirstRunAha } from "~/hooks/useFirstRunAha";
const AhaScreen = lazy(() => import("~/components/Onboarding/AhaScreen"));

export default function PantryPage() {
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
        <Suspense fallback={<View className="flex-1 bg-background" />}>
          <AhaScreen />
        </Suspense>
      </RecipeProvider>
    );
  }

  return (
    <PantryProvider>
      <RecipeProvider>
        <PantryHome />
      </RecipeProvider>
    </PantryProvider>
  );
}
