import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Linking, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRecipeImportPreview } from "~/hooks/queries/useRecipeImportPreview";
import { clearPendingRecipeShare, readPendingRecipeShare } from "~/lib/recipe-share-inbox";
import type { PendingRecipeShare } from "~/types/SharedRecipe";
import { useRecipeLoadingGlow } from "./Loading/RecipeLoadingGlowProvider";
import RecipeDetailsSkeleton from "./Details/RecipeDetailsSkeleton";
import { Button } from "~/components/ui/button";
import { H2, P } from "~/components/ui/typography";

/** Incoming shares open directly in the recipe layout, without a required edit form. */
export default function SharedRecipeImport({
  pending,
  persisted = true,
}: {
  pending: PendingRecipeShare;
  persisted?: boolean;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prepare, save, statusMessage } = useRecipeImportPreview();
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  useRecipeLoadingGlow(!error && !finished);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    const isCurrent = () => {
      if (!persisted) return mounted.current;
      const latest = readPendingRecipeShare();
      return mounted.current && (!latest || latest.id === pending.id);
    };
    void (async () => {
      try {
        const prepared = await prepare(
          {
            url: pending.url,
            text: pending.text,
            videoUri: pending.videoUri,
            language: pending.language,
          },
          {
            onSaved: () => {
              if (persisted) clearPendingRecipeShare(pending.id);
            },
          }
        );
        if (!isCurrent()) return;
        // Keep compatibility with drafts produced by older/manual extraction paths.
        const result = prepared.kind === "saved" ? prepared.result : await save(prepared.draft);
        if (!result.success || !result.recipe?.id)
          throw new Error(result.error || "Couldn't read this recipe. Please try again.");
        if (persisted) clearPendingRecipeShare(pending.id);
        if (isCurrent()) {
          setFinished(true);
          router.replace(`/recipes/${result.recipe.id}`);
        }
      } catch (cause) {
        if (isCurrent())
          setError(cause instanceof Error ? cause.message : "Couldn't import this recipe.");
      }
    })();
  }, [pending, persisted, attempt, prepare, save, router]);

  if (!error)
    return (
      <RecipeDetailsSkeleton
        message={statusMessage === "Ready to import" ? "Reading recipe…" : statusMessage}
      />
    );
  return (
    <View
      className="flex-1 justify-center gap-4 bg-background px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <H2 className="text-center">Couldn't read this recipe</H2>
      <P className="text-center text-muted-foreground" accessibilityRole="alert">
        {error}
      </P>
      <Button
        onPress={() => {
          setFinished(false);
          setError("");
          setAttempt((value) => value + 1);
        }}
      >
        <P className="font-urbanist-semibold text-primary-foreground">Try again</P>
      </Button>
      {pending.url && (
        <Button
          variant="outline"
          onPress={() => {
            void Linking.openURL(pending.url!).catch(() =>
              setError("Couldn't open the original post.")
            );
          }}
        >
          <P>View original post</P>
        </Button>
      )}
    </View>
  );
}
