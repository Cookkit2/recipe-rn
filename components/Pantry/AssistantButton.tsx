import { useRouter } from "expo-router";
import { SparklesIcon } from "lucide-uniwind";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { TEST_IDS } from "~/constants/test-ids";
import { usePantryStore } from "~/store/PantryContext";

export default function AssistantButton() {
  const router = useRouter();
  const { bottom, right } = useSafeAreaInsets();
  const { isRecipeOpen } = usePantryStore();

  if (isRecipeOpen) return null;

  return (
    <View className="absolute" style={{ bottom: bottom + 8, right: right + 16 }}>
      <Button
        testID={TEST_IDS.home.assistantButton}
        accessibilityLabel="Assistant"
        accessibilityHint="Open the cooking assistant"
        variant="secondary"
        size="icon-lg"
        className="h-14 w-14 rounded-full bg-foreground/80"
        style={{ borderRadius: 28 }}
        onPress={() => router.push("/assistant")}
      >
        <SparklesIcon className="text-background" size={26} />
      </Button>
    </View>
  );
}
