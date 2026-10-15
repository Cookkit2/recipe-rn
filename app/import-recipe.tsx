import { useState } from "react";
import { View, ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { P } from "~/components/ui/typography";
import { useImportRecipe, getImportStatusMessage } from "~/hooks/queries/useRecipeImportQueries";
import { readPendingRecipeShare, clearPendingRecipeShare } from "~/lib/recipe-share-inbox";

export default function ImportRecipePage() {
  const [pending] = useState(readPendingRecipeShare);
  const [url, setUrl] = useState(pending?.url ?? "");
  const [text, setText] = useState(pending?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const { importRecipeAsync, importStatus, isPending } = useImportRecipe();
  const router = useRouter();
  const submit = async () => {
    if (isPending) return;
    setError(null);
    try {
      const result = await importRecipeAsync({
        url: url.trim() || undefined,
        text: text.trim() || undefined,
      });
      if (!result.success || !result.recipe?.id) {
        setError(result.error ?? "Couldn't extract a recipe. Add the caption or try another link.");
        return;
      }
      if (pending) clearPendingRecipeShare(pending.id);
      router.replace(`/recipes/${result.recipe.id}/edit`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't import this recipe. Try again.");
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
          router.back();
        }}
      >
        <P>Cancel</P>
      </Button>
    </ScrollView>
  );
}
