import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import ImportRecipeDialog from "~/components/Pantry/ImportRecipeDialog";
import { useImportRecipe } from "~/hooks/queries/useRecipeImportQueries";
import { readPendingRecipeShare } from "~/lib/recipe-share-inbox";
import type { PendingRecipeShare } from "~/types/SharedRecipe";

/** Loaded only when a received share is ready to extract. */
export default function SharedRecipeImport({
  pending,
  onComplete,
}: {
  pending: PendingRecipeShare;
  onComplete: (id: string) => void;
}) {
  const router = useRouter();
  const { importRecipeAsync } = useImportRecipe();
  const [recovering, setRecovering] = useState(false);
  const started = useRef(false);
  const mounted = useRef(false);
  const toastId = `recipe-share-${pending.id}`;

  useEffect(() => {
    mounted.current = true;
    toast.loading("Importing shared recipe…", { id: toastId, duration: Infinity });
    return () => {
      mounted.current = false;
      toast.dismiss(toastId);
    };
  }, [toastId]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const isCurrent = () => mounted.current && readPendingRecipeShare()?.id === pending.id;
    const fail = (message: string) => {
      if (!isCurrent()) return;
      toast.error(message, {
        id: toastId,
        duration: 12000,
        action: {
          label: "Try again",
          onClick: () => {
            if (isCurrent()) setRecovering(true);
          },
        },
      });
    };
    void (async () => {
      try {
        const result = await importRecipeAsync({ url: pending.url, text: pending.text });
        if (!isCurrent()) return;
        if (!result.success || !result.recipe?.id) {
          fail(result.error ?? "Couldn't read this recipe. Try sharing the full caption.");
          return;
        }
        toast.dismiss(toastId);
        onComplete(pending.id);
        router.push(`/recipes/${result.recipe.id}`);
      } catch (error) {
        fail(error instanceof Error ? error.message : "Couldn't import this recipe. Try again.");
      }
    })();
  }, [pending.id, pending.url, pending.text, importRecipeAsync, onComplete, router, toastId]);

  return recovering ? (
    <ImportRecipeDialog
      open
      initialInput={pending}
      onOpenChange={(open) => {
        if (!open) onComplete(pending.id);
      }}
    />
  ) : null;
}
