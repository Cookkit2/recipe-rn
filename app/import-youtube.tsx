import React, { useEffect, useRef, useState } from "react";
import { View, TextInput, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { H4, P } from "~/components/ui/typography";
import { LinkIcon } from "lucide-uniwind";
import { Text } from "~/components/ui/text";
import {
  useImportYouTubeRecipe,
  getImportProgress,
  getImportStatusMessage,
} from "~/hooks/queries/useYouTubeRecipeQueries";
import { isValidYouTubeUrl } from "~/utils/youtube-utils";
import ImportProgressBar from "~/components/Recipe/ImportProgressBar";
import ImportResultCard from "~/components/Recipe/ImportResultCard";

export default function ImportYouTubeRecipe() {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const { importRecipe, importStatus, data, error, isPending, reset } = useImportYouTubeRecipe();
  const shouldResetOnUnmountRef = useRef(false);

  // Validate URL as user types
  useEffect(() => {
    if (youtubeUrl.trim() && !isValidYouTubeUrl(youtubeUrl)) {
      setUrlError("Please enter a valid YouTube URL");
    } else {
      setUrlError("");
    }
  }, [youtubeUrl]);

  // Clear state when successful and user navigates away
  useEffect(() => {
    shouldResetOnUnmountRef.current = Boolean(data?.success);
  }, [data?.success]);

  useEffect(() => {
    return () => {
      if (shouldResetOnUnmountRef.current) {
        reset();
      }
    };
  }, [reset]);

  const handleImport = () => {
    if (!youtubeUrl.trim()) {
      setUrlError("Please enter a YouTube URL");
      return;
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      setUrlError("Invalid YouTube URL");
      return;
    }

    importRecipe(youtubeUrl);
  };

  const handleClear = () => {
    reset();
    setYoutubeUrl("");
    setUrlError("");
  };

  const handleViewRecipe = () => {
    if (data?.recipe?.id) {
      router.push(`/recipes/${data.recipe.id}`);
    }
  };

  const isImporting = isPending || importStatus !== "idle";
  const hasResult = !!(data || error);
  const isSuccess = data?.success && data.recipe;
  const progress = getImportProgress(importStatus);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-6"
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Title Section */}
      <P className="text-muted-foreground mb-6">
        Paste a YouTube cooking video URL to automatically extract the recipe
      </P>

      {/* URL Input Section */}
      {!hasResult && (
        <View className="mb-6">
          <View className="mb-2">
            <Text className="text-foreground font-medium mb-1">Video URL</Text>
            <View
              className={`flex-row items-center bg-muted rounded-xl px-4 py-3 border ${
                urlError ? "border-destructive" : "border-transparent"
              }`}
            >
              <LinkIcon className="text-muted-foreground mr-2" size={18} />
              <TextInput
                className="flex-1 text-foreground text-base"
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#888"
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                keyboardType="url"
                editable={!isImporting}
              />
            </View>
            {urlError && <Text className="text-destructive text-sm mt-1 ml-1">{urlError}</Text>}
          </View>

          {/* Import Button */}
          <Pressable
            className={`py-4 rounded-xl items-center justify-center mt-4 ${
              isImporting || !!urlError || !youtubeUrl.trim()
                ? "bg-muted"
                : "bg-primary active:bg-primary/90"
            }`}
            onPress={handleImport}
            disabled={isImporting || !!urlError || !youtubeUrl.trim()}
          >
            {isImporting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-primary-foreground font-bold text-lg">Import Recipe</Text>
            )}
          </Pressable>

          {/* Tips */}
          <View className="mt-6 p-4 bg-muted/50 rounded-xl">
            <H4 className="text-foreground mb-2">💡 Tips</H4>
            <View className="space-y-1">
              <Text className="text-muted-foreground text-sm">
                • Works with any cooking video on YouTube
              </Text>
              <Text className="text-muted-foreground text-sm">
                • Supports regular videos, shorts, and live videos
              </Text>
              <Text className="text-muted-foreground text-sm">
                • Best results with videos that show ingredients and steps
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Progress Section */}
      {isImporting && (
        <View className="mb-6">
          <ImportProgressBar
            progress={progress}
            status={importStatus}
            message={getImportStatusMessage(importStatus)}
          />
        </View>
      )}

      {/* Result Section */}
      {hasResult && !isImporting && (
        <ImportResultCard
          data={data}
          error={error}
          onViewRecipe={handleViewRecipe}
          onTryAgain={handleClear}
        />
      )}
    </ScrollView>
  );
}
