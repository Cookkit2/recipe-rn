import { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigationContainerRef,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { AppState, Linking } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { toast } from "sonner-native";
import { storage } from "~/data";
import { ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import { normalizeIncomingRecipeShare } from "~/utils/shared-recipe";
import { isSharedRecipeIntent } from "~/utils/native-share-route";
import { readPendingRecipeShare, savePendingRecipeShare } from "~/lib/recipe-share-inbox";
import { log } from "~/utils/logger";

export default function SocialRecipeShareHandler() {
  const router = useRouter();
  const routed = useRef<string | null>(null);
  const root = useRootNavigationState();
  const navigation = useNavigationContainerRef();
  const segments = useSegments();
  const [ready, setReady] = useState(() => navigation.isReady());
  const [revision, setRevision] = useState(0);
  const pending = useMemo(readPendingRecipeShare, [revision]);
  useEffect(() => {
    const updateReady = () => setReady(navigation.isReady());
    updateReady();
    return navigation.addListener("state", updateReady);
  }, [navigation]);
  useEffect(() => {
    // Older binaries can still use the manual import dialog until rebuilt.
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
        // Persist raw text before clearing the OS payload or starting extraction.
        const input = normalizeIncomingRecipeShare(payloads);
        if (!input) {
          clearSharedPayloads();
          toast.error("Share a recipe link or caption to import it.");
          return;
        }
        savePendingRecipeShare(input);
        log.debug("Recipe share received", { hasUrl: !!input.url, hasCaption: !!input.text });
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
      !pending ||
      !root?.key ||
      !ready ||
      !navigation.isReady() ||
      !storage.get<boolean>(ONBOARDING_COMPLETED_KEY) ||
      segments[0] === "onboarding" ||
      routed.current === pending.id
    )
      return;
    routed.current = pending.id;
    // Navigate before extraction. The route owns the skeleton, retry and final detail handoff.
    const target = { pathname: "/recipes/import" as const, params: { shareId: pending.id } };
    if (segments.join("/") === "recipes/import") router.replace(target);
    else router.push(target);
  }, [pending, root?.key, ready, navigation, segments, router]);
  return null;
}
