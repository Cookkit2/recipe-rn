import { useEffect } from "react";
import { useRouter } from "expo-router";
import {
  registerNotificationHandler,
  unregisterNotificationHandler,
  extractNotificationData,
  ACHIEVEMENT_UNLOCKED_TYPE,
  CHALLENGE_COMPLETED_TYPE,
  INGREDIENT_EXPIRY_TYPE,
} from "~/lib/notifications";

export function useNotificationHandlers() {
  const router = useRouter();

  // Single handler for ingredient_expiry: deep link to first recipe or pantry
  useEffect(() => {
    registerNotificationHandler(INGREDIENT_EXPIRY_TYPE, (response) => {
      const data = extractNotificationData(response);
      const recipeIds = data?.recipeIds as string[] | undefined;
      if (recipeIds && recipeIds.length > 0) {
        router.push(`/recipes/${recipeIds[0]}`);
      } else {
        router.push("/");
      }
    });

    return () => {
      unregisterNotificationHandler(INGREDIENT_EXPIRY_TYPE);
    };
  }, [router]);

  useEffect(() => {
    registerNotificationHandler(ACHIEVEMENT_UNLOCKED_TYPE, () => {
      router.push("/profile/achievements");
    });

    return () => {
      unregisterNotificationHandler(ACHIEVEMENT_UNLOCKED_TYPE);
    };
  }, [router]);

  useEffect(() => {
    registerNotificationHandler(CHALLENGE_COMPLETED_TYPE, () => {
      router.push("/profile/achievements");
    });

    return () => {
      unregisterNotificationHandler(CHALLENGE_COMPLETED_TYPE);
    };
  }, [router]);
}
