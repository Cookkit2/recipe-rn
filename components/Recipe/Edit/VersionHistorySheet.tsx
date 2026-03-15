import React, { useCallback, useRef } from "react";
import { Alert, StyleSheet, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "@rn-primitives/portal";
import { H2, H3, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { HistoryIcon, ClockIcon } from "lucide-uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "~/hooks/useColor";
import type { RecipeVersionMetadata } from "~/hooks/useRecipeVersioning";

type VersionHistorySheetProps = {
  versions: RecipeVersionMetadata[];
  isLoading: boolean;
  onRevert: (versionNumber: number, version: RecipeVersionMetadata) => void;
  onClose: () => void;
};

export default function VersionHistorySheet({
  versions,
  isLoading,
  onRevert,
  onClose,
}: VersionHistorySheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { bottom } = useSafeAreaInsets();
  const colors = useColors();

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  const handleRevert = useCallback(
    (version: RecipeVersionMetadata) => {
      Alert.alert(
        "Revert to Version",
        `Are you sure you want to revert to version ${version.versionNumber}? This will replace your current edits with the saved version from ${formatDate(version.createdAt)}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Revert",
            style: "destructive",
            onPress: () => {
              onRevert(version.versionNumber, version);
              bottomSheetRef.current?.close();
            },
          },
        ]
      );
    },
    [onRevert]
  );

  // Format date for display
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <Portal name="version-history-sheet">
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={["70%"]}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={[styles.contentContainer, { paddingBottom: bottom }]}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-2 pb-4">
            <View className="flex-row items-center gap-3">
              <View className="bg-muted/30 rounded-full p-2">
                <HistoryIcon size={20} strokeWidth={2.5} className="text-foreground" />
              </View>
              <H2>Version History</H2>
            </View>
          </View>

          <Separator className="mb-4" />

          {/* Content */}
          <View className="flex-1 px-6">
            {isLoading ? (
              <View className="py-12 items-center justify-center">
                <P className="text-muted-foreground">Loading versions...</P>
              </View>
            ) : versions.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <P className="text-muted-foreground text-center">
                  No version history yet. Versions are automatically created when you save changes.
                </P>
              </View>
            ) : (
              <View className="gap-3">
                {versions.map((version) => (
                  <View key={version.id} className="bg-muted/50 rounded-xl p-4 gap-3">
                    {/* Version Header */}
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 gap-1">
                        <View className="flex-row items-center gap-2">
                          <H3 className="text-base">Version {version.versionNumber}</H3>
                          {version.versionNumber === versions[0]?.versionNumber && (
                            <View className="bg-primary/20 px-2 py-0.5 rounded-full">
                              <P className="text-xs text-primary font-urbanist-medium">Latest</P>
                            </View>
                          )}
                        </View>
                        <View className="flex-row items-center gap-1.5">
                          <ClockIcon size={12} className="text-muted-foreground" />
                          <P className="text-sm text-muted-foreground">
                            {formatDate(version.createdAt)}
                          </P>
                        </View>
                      </View>

                      {/* Revert Button */}
                      {version.versionNumber !== versions[0]?.versionNumber && (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => handleRevert(version)}
                          className="rounded-full"
                        >
                          <P className="text-sm font-urbanist-medium">Revert</P>
                        </Button>
                      )}
                    </View>

                    {/* Version Details */}
                    <View className="gap-1.5">
                      <P className="text-foreground font-urbanist-medium" numberOfLines={1}>
                        {version.title || "Untitled"}
                      </P>
                      <P className="text-sm text-muted-foreground" numberOfLines={2}>
                        {version.description || "No description"}
                      </P>
                      <View className="flex-row items-center gap-4 mt-1">
                        <P className="text-xs text-muted-foreground">
                          {version.servings} serving{version.servings !== 1 ? "s" : ""}
                        </P>
                        <P className="text-xs text-muted-foreground">
                          {version.prepMinutes + version.cookMinutes} min
                        </P>
                        {version.difficultyStars > 0 && (
                          <P className="text-xs text-muted-foreground">
                            {"⭐".repeat(Math.min(5, Math.round(version.difficultyStars)))}
                          </P>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Footer Info */}
          <View className="px-6 pt-4 border-t border-border/50">
            <P className="text-xs text-muted-foreground text-center">
              Versions are automatically created when you save changes. Old versions may be deleted
              to save space.
            </P>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
  },
});
