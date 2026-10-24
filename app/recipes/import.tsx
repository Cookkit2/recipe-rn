import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import SharedRecipeImport from "~/components/Recipe/SharedRecipeImport";
import { P } from "~/components/ui/typography";
import { readPendingRecipeShare } from "~/lib/recipe-share-inbox";

export default function ImportSharedRecipeScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  const pending = useMemo(readPendingRecipeShare, [shareId]);
  if (!pending || pending.id !== shareId)
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <P>Share a recipe to open it here.</P>
      </View>
    );
  return <SharedRecipeImport key={pending.id} pending={pending} />;
}
