import { ActivityIndicator, View } from "react-native";
import { SparklesIcon } from "lucide-uniwind";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { TEST_IDS } from "~/constants/test-ids";

export function SearchAssistantHeader({
  query,
  hasConversation,
  showConversation,
  streaming,
  onAsk,
  onStop,
  onViewChange,
}: {
  query: string;
  hasConversation: boolean;
  showConversation: boolean;
  streaming: boolean;
  onAsk: () => void;
  onStop: () => void;
  onViewChange: (conversation: boolean) => void;
}) {
  return (
    <View className="gap-3 pb-4">
      {hasConversation && (
        <View className="flex-row gap-2">
          <Button
            size="sm"
            variant={showConversation ? "ghost" : "secondary"}
            accessibilityState={{ selected: !showConversation }}
            onPress={() => onViewChange(false)}
          >
            <Text>Search results</Text>
          </Button>
          <Button
            size="sm"
            variant={showConversation ? "secondary" : "ghost"}
            accessibilityState={{ selected: showConversation }}
            onPress={() => onViewChange(true)}
          >
            <Text>Cookkit</Text>
          </Button>
        </View>
      )}
      {streaming ? (
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" />
            <Text accessibilityLiveRegion="polite" className="text-sm text-muted-foreground">
              Cookkit is thinking…
            </Text>
          </View>
          <Button
            size="sm"
            variant="ghost"
            onPress={onStop}
            accessibilityLabel="Stop Cookkit"
            testID={TEST_IDS.search.stopAssistant}
          >
            <Text>Stop</Text>
          </Button>
        </View>
      ) : query ? (
        <Button
          variant="secondary"
          className="h-auto min-h-12 native:h-auto flex-row justify-start gap-3 rounded-2xl"
          accessibilityLabel="Ask Cookkit"
          accessibilityHint="Send this text to the cooking assistant"
          testID={TEST_IDS.search.askAssistant}
          onPress={onAsk}
        >
          <SparklesIcon size={20} className="text-foreground" />
          <View className="flex-1 gap-0.5">
            <Text className="font-urbanist-semibold">Ask Cookkit</Text>
            <Text className="text-sm text-muted-foreground" numberOfLines={1}>
              {query}
            </Text>
          </View>
        </Button>
      ) : hasConversation ? (
        <Text className="text-sm text-muted-foreground">
          Use the search bar to ask a follow-up.
        </Text>
      ) : null}
    </View>
  );
}
