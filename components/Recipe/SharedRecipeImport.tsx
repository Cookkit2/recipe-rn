import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import ImportRecipeDialog from "~/components/Pantry/ImportRecipeDialog";
import { useRecipeImportPreview } from "~/hooks/queries/useRecipeImportPreview";
import RecipeImportReview from "./RecipeImportReview";
import type { RecipeImportDraft } from "~/types/RecipeImportDraft";
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
  const { prepare, save, isPending } = useRecipeImportPreview();
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [draft, setDraft] = useState<RecipeImportDraft>();
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
      toast.dismiss(toastId);
      setRecoveryError(message);
      setRecovering(true);
    };
    void (async () => {
      try {
        const prepared = await prepare({ url: pending.url, text: pending.text });
        if (!isCurrent()) return;
        if (prepared.kind === "review") {
          toast.dismiss(toastId);
          setDraft(prepared.draft);
          return;
        }
        const result = prepared.result;
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
  }, [pending.id, pending.url, pending.text, prepare, onComplete, router, toastId]);

  if (draft)
    return (
      <RecipeImportReview
        draft={draft}
        saving={isPending}
        onBack={() => {
          setDraft(undefined);
          setRecovering(true);
        }}
        onSave={async (reviewed) => {
          try {
            const result = await save(reviewed);
            if (!mounted.current || readPendingRecipeShare()?.id !== pending.id) return;
            if (!result.success || !result.recipe?.id)
              throw new Error(result.error || "Couldn't save this recipe.");
            onComplete(pending.id);
            router.push(`/recipes/${result.recipe.id}`);
          } catch (error) {
            if (mounted.current && readPendingRecipeShare()?.id === pending.id)
              toast.error(error instanceof Error ? error.message : "Couldn't save this recipe.");
          }
        }}
      />
    );

  return recovering ? (
    <ImportRecipeDialog
      open
      initialInput={pending}
      initialError={recoveryError}
      onOpenChange={(open) => {
        if (!open) onComplete(pending.id);
      }}
    />
  ) : null;
}
