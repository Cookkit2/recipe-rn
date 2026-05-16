import { useEffect } from "react";
import { useRouter } from "expo-router";
import { SplashScreen } from "expo-router";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import { IS_E2E } from "~/utils/e2e-flags";

export function useOnboardingCheck() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      if (IS_E2E) {
        storage.set(ONBOARDING_COMPLETED_KEY, true);
        void SplashScreen.hideAsync();
        return;
      }

      const completed = storage.get<boolean>(ONBOARDING_COMPLETED_KEY);
      if (completed !== true) {
        router.replace("/onboarding");
      }
      void SplashScreen.hideAsync();
    }, 0);
  }, [router]);
}
