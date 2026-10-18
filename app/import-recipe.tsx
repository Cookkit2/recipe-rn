import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { P } from "~/components/ui/typography";
import { useImportRecipe, getImportStatusMessage } from "~/hooks/queries/useRecipeImportQueries";
import { readPendingRecipeShare, clearPendingRecipeShare } from "~/lib/recipe-share-inbox";
import type { PendingRecipeShare } from "~/types/SharedRecipe";

export default function ImportRecipePage() {
  const { shareId } = useLocalSearchParams<{ shareId?: string }>();
  const pending = useMemo(() => {
    const incoming = readPendingRecipeShare();
    return incoming && (!shareId || incoming.id === shareId) ? incoming : null;
  }, [shareId]);
  return <ImportRecipeForm key={pending?.id ?? "manual"} pending={pending} />;
}

function ImportRecipeForm({ pending }: { pending: PendingRecipeShare | null }) {
  const [url, setUrl] = useState(pending?.url ?? "");
  const [text, setText] = useState(pending?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const { importRecipeAsync, importStatus, isPending } = useImportRecipe();
  const router = useRouter();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const submit = async () => {
    if (isPending) return;
    setError(null);
    try {
      const result = await importRecipeAsync({
        url: url.trim() || undefined,
        text: text.trim() || undefined,
      });
      // A second share can replace this form while the first extraction finishes.
      if (!mounted.current || (pending && readPendingRecipeShare()?.id !== pending.id)) return;
      if (!result.success || !result.recipe?.id) {
        setError(result.error ?? "Couldn't extract a recipe. Add the caption or try another link.");
        return;
      }
      if (pending) clearPendingRecipeShare(pending.id);
      router.replace(`/recipes/${result.recipe.id}/edit`);
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error ? cause.message : "Couldn't import this recipe. Try again."
        );
    }
  };
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ padding: 24, gap: 16 }}
    >
      <Stack.Screen options={{ headerTitle: "Import recipe" }} />
      <P>Import from a recipe link or caption, then review the ingredients and steps.</P>
      <Input
        accessibilityLabel="Recipe URL"
        placeholder="Recipe link (optional)"
        value={url}
        onChangeText={setUrl}
        editable={!isPending}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Input
        accessibilityLabel="Recipe caption"
        placeholder="Paste the recipe caption or instructions"
        value={text}
        onChangeText={setText}
        editable={!isPending}
        multiline
        maxLength={32000}
        className="min-h-36"
        textAlignVertical="top"
      />
      {isPending && <P className="text-muted-foreground">{getImportStatusMessage(importStatus)}</P>}
      {error && (
        <P accessibilityRole="alert" className="text-destructive">
          {error}
        </P>
      )}
      <Button onPress={submit} disabled={!url.trim() && !text.trim()} isLoading={isPending}>
        <P>Extract recipe</P>
      </Button>
      <Button
        variant="ghost"
        disabled={isPending}
        onPress={() => {
          if (pending) clearPendingRecipeShare(pending.id);
          if (router.canGoBack()) router.back();
          else router.replace("/");
        }}
      >
        <P>Cancel</P>
      </Button>
    </ScrollView>
  );
}
