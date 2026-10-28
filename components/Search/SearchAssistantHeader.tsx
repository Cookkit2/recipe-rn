import { View } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { TEST_IDS } from "~/constants/test-ids";
import { SearchHelperText } from "./SearchHelperText";

export function SearchAssistantHeader({
  showHint,
  showConversation,
  streaming,
  onStop,
}: {
  showHint: boolean;
  showConversation: boolean;
  streaming: boolean;
  onStop: () => void;
}) {
  if (!showConversation || (!showHint && !streaming)) return null;
  return (
    <View className={showHint ? "items-center px-6 py-8" : "items-end px-6 pb-3"}>
      {showHint ? <SearchHelperText>Ask Cookkit AI</SearchHelperText> : null}
      {streaming ? (
        <Button
          variant="ghost"
          size="sm"
          accessibilityLabel="Stop Cookkit"
          testID={TEST_IDS.search.stopAssistant}
          onPress={onStop}
        >
          <Text className="text-sm text-muted-foreground">Stop</Text>
        </Button>
      ) : null}
    </View>
  );
}
