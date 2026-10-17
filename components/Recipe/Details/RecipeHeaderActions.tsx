import { Pressable, View } from "react-native";
import { Share2Icon } from "lucide-uniwind";
import AddToPlanHeaderButton from "./AddToPlanHeaderButton";

export default function RecipeHeaderActions({ onShare }: { onShare?: () => void }) {
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
          <Share2Icon className="text-foreground" size={22} />
        </Pressable>
      )}
      <AddToPlanHeaderButton />
    </View>
  );
}
