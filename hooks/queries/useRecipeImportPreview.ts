import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  recipeImportApi,
  getImportStatusMessage,
  type RecipeImportStatus,
} from "~/data/api/recipeImportApi";
import { useRecipeImportActivity } from "~/hooks/useRecipeImportActivity";
import { recipeQueryKeys } from "./recipeQueryKeys";
import type { SharedRecipeInput } from "~/types/SharedRecipe";
import type { RecipeImportDraft } from "~/types/RecipeImportDraft";

export function useRecipeImportPreview() {
  const client = useQueryClient();
  const current = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const saving = useRef(false);
  const [isPending, setPending] = useState(false);
  useRecipeImportActivity(isPending);
  const [status, setStatus] = useState<RecipeImportStatus>("idle");
  const invalidate = useCallback(() => {
    for (const key of [
      recipeQueryKeys.recipes(),
      recipeQueryKeys.available(),
      recipeQueryKeys.recommendations(),
    ])
      void client.invalidateQueries({ queryKey: key });
  }, [client]);
  const cancel = useCallback(() => {
    current.current?.abort();
    current.current = null;
    if (mounted.current) {
      setPending(false);
      setStatus("idle");
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // React Strict Mode replays setup immediately; keep the single active import in that case.
      queueMicrotask(() => {
        if (!mounted.current) cancel();
      });
    };
  }, [cancel]);
  const prepare = useCallback(
    async (input: SharedRecipeInput, options?: { onSaved?: () => void }) => {
      cancel();
      const controller = new AbortController();
      current.current = controller;
      setPending(true);
      try {
        const result = await recipeImportApi.prepareSharedRecipe(
          input,
          (next) => {
            if (current.current === controller) setStatus(next);
          },
          { signal: controller.signal }
        );
        // A database save is atomic. Record success even if the user left while it committed,
        // so a restored native payload cannot save the same import again.
        if (result.kind === "saved" && result.result.success && result.result.recipe?.id) {
          options?.onSaved?.();
          invalidate();
        }
        controller.signal.throwIfAborted();
        return result;
      } finally {
        if (current.current === controller) {
          current.current = null;
          if (mounted.current) setPending(false);
        }
      }
    },
    [cancel, invalidate]
  );
  const save = useCallback(
    async (draft: RecipeImportDraft) => {
      if (saving.current) throw new Error("The recipe is already being saved.");
      saving.current = true;
      setPending(true);
      try {
        const result = await recipeImportApi.saveRecipeDraft(draft);
        if (result.success) invalidate();
        return result;
      } finally {
        saving.current = false;
        if (mounted.current) setPending(false);
      }
    },
    [invalidate]
  );
  return { prepare, save, cancel, isPending, statusMessage: getImportStatusMessage(status) };
}
