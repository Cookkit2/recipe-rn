import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useRecipeLoadingGlow } from "~/components/Recipe/Loading/RecipeLoadingGlowProvider";
import RecipeImportReview from "~/components/Recipe/RecipeImportReview";
import { useRecipeImportPreview } from "~/hooks/queries/useRecipeImportPreview";
import { normalizeSharedRecipe } from "~/utils/shared-recipe";
import type { SharedRecipeInput } from "~/types/SharedRecipe";
import type { RecipeImportDraft } from "~/types/RecipeImportDraft";

interface ImportRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialInput?: SharedRecipeInput;
  initialError?: string;
}

export default function ImportRecipeDialog({
  open,
  onOpenChange,
  initialInput,
  initialError,
}: ImportRecipeDialogProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [videoUri, setVideoUri] = useState<string>();
  const [language, setLanguage] = useState("en-US");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<RecipeImportDraft>();
  const request = useRef(0);
  const { prepare, save, cancel, statusMessage, isPending } = useRecipeImportPreview();
  useRecipeLoadingGlow(open && isPending);

  useEffect(() => {
    if (open) {
      setContent([initialInput?.url, initialInput?.text].filter(Boolean).join("\n\n"));
      setVideoUri(initialInput?.videoUri);
      setLanguage(initialInput?.language || "en-US");
      setDraft(undefined);
      setError(initialError || "");
    }
    return () => {
      request.current += 1;
      cancel();
    };
  }, [
    open,
    initialInput?.url,
    initialInput?.text,
    initialInput?.videoUri,
    initialInput?.language,
    initialError,
    cancel,
  ]);

  const finish = (id: string) => {
    toast.success("Recipe saved");
    onOpenChange(false);
    router.push(`/recipes/${id}`);
  };
  const handleSubmit = async () => {
    if (isPending) return;
    const source = normalizeSharedRecipe({ text: content });
    if (!source && !videoUri) {
      setError("Paste a recipe link, caption or choose a video.");
      return;
    }
    const currentRequest = ++request.current;
    setError("");
    try {
      const result = await prepare({ ...source, ...(videoUri ? { videoUri, language } : {}) });
      if (request.current !== currentRequest) return;
      if (result.kind === "review") setDraft(result.draft);
      else if (result.result.success && result.result.recipe?.id) finish(result.result.recipe.id);
      else
        setError(
          result.result.error ||
            "Couldn't read this recipe. Choose a video or paste the full caption."
        );
    } catch (err) {
      if (request.current === currentRequest)
        setError(err instanceof Error ? err.message : "Couldn't read this recipe.");
    }
  };
  const chooseVideo = async () => {
    const epoch = request.current;
    try {
      const picker = await import("expo-image-picker");
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
      });
      if (request.current !== epoch || result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      if ((asset.fileSize ?? 0) > 40_000_000 || (asset.duration ?? 0) > 180_000) {
        setError("Choose a video under 3 minutes and 40 MB.");
        return;
      }
      setVideoUri(asset.uri);
      setError("");
    } catch {
      if (request.current === epoch)
        setError("Couldn't open your videos. Try pasting the full caption.");
    }
  };
  const handleOpenChange = (next: boolean) => {
    if (!next && draft && isPending) return;
    if (!next) {
      request.current += 1;
      cancel();
    }
    onOpenChange(next);
  };
  if (!open) return null;
  if (draft)
    return (
      <RecipeImportReview
        draft={draft}
        saving={isPending}
        onBack={() => setDraft(undefined)}
        onSave={async (reviewed) => {
          const epoch = request.current;
          try {
            const result = await save(reviewed);
            if (request.current !== epoch) return;
            if (result.success && result.recipe?.id) finish(result.recipe.id);
            else toast.error(result.error || "Couldn't save this recipe.");
          } catch (err) {
            if (request.current === epoch)
              toast.error(err instanceof Error ? err.message : "Couldn't save this recipe.");
          }
        }}
      />
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import recipe</DialogTitle>
        </DialogHeader>
        <Input
          testID="import-recipe-content-input"
          accessibilityLabel="Recipe link or caption"
          placeholder="Paste a recipe link or full caption"
          value={content}
          onChangeText={setContent}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          multiline
          maxLength={32000}
          className="min-h-36 px-4 py-4 text-left"
          textAlignVertical="top"
          editable={!isPending}
        />
        <Button variant="outline" disabled={isPending} onPress={chooseVideo}>
          <Text>{videoUri ? "Change video" : "Choose video"}</Text>
        </Button>
        {videoUri ? (
          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">
              Video selected. Up to 3 minutes / 40 MB.
            </Text>
            <Text className="text-sm">Audio language</Text>
            <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
              {(
                [
                  ["en-US", "English"],
                  ["zh-CN", "中文"],
                  ["ms-MY", "Malay"],
                  ["ta-IN", "Tamil"],
                  ["id-ID", "Indonesian"],
                ] as const
              ).map(([code, label]) => (
                <Button
                  key={code}
                  size="sm"
                  variant={language === code ? "default" : "outline"}
                  disabled={isPending}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: language === code }}
                  onPress={() => setLanguage(code)}
                >
                  <Text>{label}</Text>
                </Button>
              ))}
            </View>
            <Button variant="ghost" disabled={isPending} onPress={() => setVideoUri(undefined)}>
              <Text>Remove video</Text>
            </Button>
          </View>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-sm text-destructive">
            {error}
          </Text>
        ) : null}
        {isPending ? (
          <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">
            {statusMessage}
          </Text>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onPress={() => handleOpenChange(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button
            onPress={handleSubmit}
            disabled={(!content.trim() && !videoUri) || isPending}
            isLoading={isPending}
          >
            <Text>Continue</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
