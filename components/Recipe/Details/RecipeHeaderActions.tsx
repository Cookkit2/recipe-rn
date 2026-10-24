import { Platform, Pressable, View } from "react-native";
import { SymbolView } from "expo-symbols";
import { Share2Icon } from "lucide-uniwind";
import useColors from "~/hooks/useColor";
import AddToPlanHeaderButton from "./AddToPlanHeaderButton";

export default function RecipeHeaderActions({ onShare }: { onShare?: () => void }) {
  const colors = useColors();
  return (
    <View className="flex-row items-center gap-2">
      {onShare && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share recipe"
          accessibilityHint="Opens the share sheet with this recipe and a Cookkit link"
          onPress={onShare}
          className="h-11 w-11 items-center justify-center"
        >
          {Platform.OS === "ios" ? (
            <SymbolView
              name="square.and.arrow.up"
              size={22}
              weight="regular"
              tintColor={colors.foreground}
            />
          ) : (
            <Share2Icon className="text-foreground" size={22} />
          )}
        </Pressable>
      )}
      <AddToPlanHeaderButton />
    </View>
  );
}
