import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useRouter } from "expo-router";
import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { storage } from "~/data";
import { createClipboardRecipeMonitor } from "~/lib/clipboard-recipe-import";
import { readPendingRecipeShare, savePendingRecipeShare } from "~/lib/recipe-share-inbox";
import { useRecipeImportBusy } from "~/hooks/useRecipeImportActivity";
import type { ClipboardRecipe } from "~/utils/clipboard-recipe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";

const HISTORY_KEY = "clipboard_recipe_history";
interface Props {
  enabled: boolean;
  hasPendingShare?: () => boolean;
  revision: number;
  receiving: () => boolean;
  version?: () => number;
  onImportStarted?: (id: string) => void;
}
interface Candidate {
  recipe: ClipboardRecipe;
  reply: (accept: boolean) => void;
}

/** Native-only caller: reads once after launch/resume, after OS shares have been received. */
export default function ClipboardRecipePrompt({
  enabled,
  hasPendingShare,
  revision,
  receiving,
  version,
  onImportStarted,
}: Props) {
  const router = useRouter();
  const busy = useRecipeImportBusy();
  const [candidate, setCandidate] = useState<Candidate>();
  const current = useRef({
    enabled,
    hasPendingShare,
    busy,
    receiving,
    version,
    onImportStarted,
    router,
    mounted: true,
  });
  current.current = {
    enabled,
    hasPendingShare,
    busy,
    receiving,
    version,
    onImportStarted,
    router,
    mounted: true,
  };
  const [monitor] = useState(() =>
    createClipboardRecipeMonitor({
      read: async () => {
        const { default: clipboard } = await import("@react-native-clipboard/clipboard");
        return clipboard.getString();
      },
      version: () => current.current.version?.() ?? 0,
      hash: (identity) => digestStringAsync(CryptoDigestAlgorithm.SHA256, identity),
      available: () =>
        current.current.mounted &&
        current.current.enabled &&
        !current.current.busy &&
        !current.current.receiving() &&
        AppState.currentState !== "background" &&
        AppState.currentState !== "inactive" &&
        !(current.current.hasPendingShare?.() ?? readPendingRecipeShare()),
      readHistory: () => {
        try {
          const history: unknown = JSON.parse(storage.get<string>(HISTORY_KEY) || "[]");
          return Array.isArray(history)
            ? history.filter((value): value is string => typeof value === "string").slice(-100)
            : [];
        } catch {
          return [];
        }
      },
      writeHistory: (history) => storage.set(HISTORY_KEY, JSON.stringify(history)),
      prompt: (recipe, reply) => setCandidate({ recipe, reply }),
      onImport: ({ platform: _platform, ...input }) => {
        const pending = savePendingRecipeShare(input);
        current.current.onImportStarted?.(pending.id);
        current.current.router.push({
          pathname: "/recipes/import",
          params: { shareId: pending.id },
        });
      },
    })
  );
  useEffect(() => {
    current.current.mounted = true;
    return () => {
      current.current.mounted = false;
    };
  }, []);
  useEffect(() => {
    if (enabled && !busy) void monitor.check();
    else monitor.pause();
  }, [monitor, enabled, revision, busy]);
  useEffect(() => {
    if ((!enabled || busy) && candidate) {
      candidate.reply(false);
      setCandidate(undefined);
    }
  }, [enabled, busy, candidate]);
  const answer = (accept: boolean) => {
    candidate?.reply(accept);
    setCandidate(undefined);
  };
  return (
    <Dialog
      open={!!candidate && enabled && !busy}
      onOpenChange={(open) => {
        if (!open) answer(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import recipe from copied link?</DialogTitle>
        </DialogHeader>
        <Text className="text-muted-foreground">
          Check this {candidate?.recipe.platform} video for a recipe.
        </Text>
        <DialogFooter>
          <Button variant="outline" onPress={() => answer(false)}>
            <Text>Dismiss</Text>
          </Button>
          <Button onPress={() => answer(true)}>
            <Text>Import</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
