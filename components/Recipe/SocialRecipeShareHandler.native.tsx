import { useEffect, useRef, useState } from "react";
import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import { AppState, Linking } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { toast } from "sonner-native";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import { normalizeIncomingRecipeShare } from "~/utils/shared-recipe";
import { isSharedRecipeIntent } from "~/utils/native-share-route";
import { readPendingRecipeShare, savePendingRecipeShare } from "~/lib/recipe-share-inbox";

export default function SocialRecipeShareHandler() {
  const root = useRootNavigationState();
  const router = useRouter();
  const segments = useSegments();
  const [revision, setRevision] = useState(0);
  const routed = useRef<string | null>(null);
  useEffect(() => {
    // Older development binaries can still use the paste/import screen until rebuilt.
    if (!requireOptionalNativeModule("ExpoSharing")) return;
    let disposed = false;
    let receiving = false;
    const receive = async () => {
      if (receiving) return;
      receiving = true;
      try {
        const { getSharedPayloads, clearSharedPayloads } = await import("expo-sharing");
        if (disposed) return;
        const payloads = getSharedPayloads();
        if (payloads.length === 0) return;
        // Read raw text instead of resolving URLs before the user chooses Extract.
        const input = normalizeIncomingRecipeShare(payloads);
        if (!input) {
          clearSharedPayloads();
          toast.error("Share a recipe link or caption to import it.");
          return;
        }
        savePendingRecipeShare(input);
        setRevision((value) => value + 1);
        clearSharedPayloads();
      } catch {
        if (!disposed)
          toast.error("Couldn't receive this share. Try sharing it again or pasting the caption.");
      } finally {
        receiving = false;
      }
    };
    void receive();
    const state = AppState.addEventListener("change", (next) => {
      if (next === "active") void receive();
    });
    const links = Linking.addEventListener("url", ({ url }) => {
      if (isSharedRecipeIntent(url)) void receive();
    });
    return () => {
      disposed = true;
      state.remove();
      links.remove();
    };
  }, []);
  useEffect(() => {
    if (
      !root?.key ||
      !storage.get<boolean>(ONBOARDING_COMPLETED_KEY) ||
      segments[0] === "onboarding"
    )
      return;
    const pending = readPendingRecipeShare();
    if (pending && pending.id !== routed.current) {
      routed.current = pending.id;
      if (segments[0] === "import-recipe") router.setParams({ shareId: pending.id });
      else router.push({ pathname: "/import-recipe", params: { shareId: pending.id } });
    }
  }, [root?.key, segments, revision, router]);
  return null;
}
