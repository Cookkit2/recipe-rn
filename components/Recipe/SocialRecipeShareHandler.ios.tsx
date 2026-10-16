import { useEffect, useRef, useState } from "react";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useShareIntent, ShareIntentModule } from "expo-share-intent";
import { toast } from "sonner-native";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import { normalizeSharedRecipe } from "~/utils/shared-recipe";
import { readPendingRecipeShare, savePendingRecipeShare } from "~/lib/recipe-share-inbox";

export default function SocialRecipeShareHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent({
    debug: false,
    resetOnBackground: false,
    disabled: !ShareIntentModule,
  });
  const root = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();
  const [revision, setRevision] = useState(0);
  const routed = useRef<string | null>(null);
  useEffect(() => {
    if (!hasShareIntent) return;
    const input = normalizeSharedRecipe(shareIntent);
    if (input) {
      savePendingRecipeShare(input);
      setRevision((value) => value + 1);
    } else toast.error("Share a recipe link or caption to import it.");
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);
  useEffect(() => {
    if (error) toast.error("Couldn't receive this share. Try pasting the recipe link.");
  }, [error]);
  useEffect(() => {
    if (
      !root?.key ||
      !storage.get<boolean>(ONBOARDING_COMPLETED_KEY) ||
      segments[0] === "onboarding" ||
      segments[0] === "import-recipe"
    )
      return;
    const pending = readPendingRecipeShare();
    if (pending && pending.id !== routed.current) {
      routed.current = pending.id;
      router.push({ pathname: "/import-recipe", params: { shareId: pending.id } });
    }
  }, [root?.key, segments, revision, router]);
  return null;
}
