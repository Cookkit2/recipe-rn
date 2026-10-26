import { useEffect, useRef, useState } from "react";
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
import type { PendingRecipeShare } from "~/types/SharedRecipe";

export default function SocialRecipeShareHandler() {
  const router = useRouter();
  const routed = useRef<string | null>(null);
  const root = useRootNavigationState();
  const navigation = useNavigationContainerRef();
  const segments = useSegments();
  const [ready, setReady] = useState(() => navigation.isReady());
  // Saved retry data is not a new share request. Only this session's receiver may navigate.
  const [pending, setPending] = useState<PendingRecipeShare | null>(null);
  useEffect(() => {
    const updateReady = () => setReady(navigation.isReady());
    updateReady();
    return navigation.addListener("state", updateReady);
  }, [navigation]);
  useEffect(() => {
    // Older binaries can still use the manual import dialog until rebuilt.
    const nativeSharing = requireOptionalNativeModule<{
      getSharedPayloads?: () => unknown;
      clearSharedPayloads?: () => void;
    }>("ExpoSharing");
    if (
      typeof nativeSharing?.getSharedPayloads !== "function" ||
      typeof nativeSharing.clearSharedPayloads !== "function"
    )
      return;
    let disposed = false;
    let receiving = false;
    let shareRequested = false;
    let needsNativeRetry = false;
    let reportedFailure: string | null = null;
    let savedPayload: string | null = null;
    let cleanupWarningReported = false;
    const reportFailure = (key: string, message: string) => {
      if (disposed || reportedFailure === key) return;
      reportedFailure = key;
      toast.error(message);
    };
    const receive = async (explicitShare = false) => {
      shareRequested ||= explicitShare;
      needsNativeRetry ||= explicitShare;
      if (receiving || !needsNativeRetry) return;
      receiving = true;
      let payloadKey: string | null = null;
      let stage = "read";
      try {
        const { getSharedPayloads, clearSharedPayloads } = await import("expo-sharing");
        if (disposed) return;
        const payloads = getSharedPayloads();
        if (payloads.length === 0) {
          needsNativeRetry = false;
          reportedFailure = null;
          savedPayload = null;
          cleanupWarningReported = false;
          return;
        }
        payloadKey = JSON.stringify(payloads.map(({ shareType, value }) => [shareType, value]));
        if (savedPayload && savedPayload !== payloadKey && !shareRequested) {
          // A cleanup retry must not turn a different, unsolicited payload into navigation.
          needsNativeRetry = false;
          return;
        }
        const clear = () => {
          try {
            clearSharedPayloads();
            needsNativeRetry = false;
            savedPayload = null;
            cleanupWarningReported = false;
          } catch {
            // A queued import is still valid. Retry cleanup on the next probe.
            if (!cleanupWarningReported) log.warn("Could not clear the native recipe share inbox");
            cleanupWarningReported = true;
          }
        };
        // Persist raw text before clearing the OS payload or starting extraction.
        const input = normalizeIncomingRecipeShare(payloads);
        if (!input) {
          reportFailure(payloadKey, "Share a recipe link or caption to import it.");
          clear();
          return;
        }
        if (savedPayload !== payloadKey || (shareRequested && !readPendingRecipeShare())) {
          stage = "persist";
          const next = savePendingRecipeShare(input);
          savedPayload = payloadKey;
          log.debug("Recipe share received", { hasUrl: !!input.url, hasCaption: !!input.text });
          setPending(next);
        }
        reportedFailure = null;
        clear();
      } catch (error) {
        if (disposed) return;
        const context = { stage, errorName: error instanceof Error ? error.name : "NativeError" };
        // App startup/foreground probes are not user share attempts.
        if (needsNativeRetry || payloadKey) {
          if (reportedFailure !== (payloadKey ?? "native-inbox"))
            log.warn("Could not receive a native recipe share", context);
          reportFailure(
            payloadKey ?? "native-inbox",
            "Couldn't receive this share. Try sharing it again or pasting the caption."
          );
        } else
          log.debug("Native recipe share inbox unavailable during a background probe", context);
      } finally {
        receiving = false;
        shareRequested = false;
      }
    };
    void Linking.getInitialURL()
      .then((url) => receive(!!url && isSharedRecipeIntent(url)))
      .catch(() => receive());
    const state = AppState.addEventListener("change", (next) => {
      if (next === "active") void receive();
    });
    const links = Linking.addEventListener("url", ({ url }) => {
      if (isSharedRecipeIntent(url)) void receive(true);
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
