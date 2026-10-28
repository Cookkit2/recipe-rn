import { View } from "react-native";
import { ChevronLeftIcon, ArrowUpRightIcon } from "lucide-uniwind";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { TEST_IDS } from "~/constants/test-ids";

export function SearchAssistantHeader({
  query,
  hasConversation,
  showConversation,
  streaming,
  onAsk,
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
  if (showConversation)
    return (
      <View className="flex-row items-center justify-between pb-5">
        <Button
          variant="ghost"
          size="sm"
          className="flex-row gap-1 -ml-3"
          accessibilityLabel="Back to search"
          onPress={() => onViewChange(false)}
        >
          <ChevronLeftIcon size={20} className="text-foreground" />
          <Text className="font-urbanist-medium">Search</Text>
        </Button>
        <Text className="text-xl font-urbanist-semibold">Cookkit</Text>
        <View className="w-20" />
      </View>
    );
  return (
    <View className="gap-2 pb-4">
      {query ? (
        <Button
          variant="secondary"
          className="h-auto native:h-auto min-h-12 flex-row justify-between gap-3 rounded-2xl"
          accessibilityLabel="Ask Cookkit"
          accessibilityHint="Open a conversation about this search"
          testID={TEST_IDS.search.askAssistant}
          disabled={streaming}
          onPress={onAsk}
        >
          <View className="flex-1 gap-0.5">
            <Text className="font-urbanist-semibold">Ask Cookkit</Text>
            <Text className="text-sm font-urbanist-medium text-muted-foreground" numberOfLines={1}>
              {query}
            </Text>
          </View>
          <ArrowUpRightIcon size={20} className="text-foreground" />
        </Button>
      ) : null}
      {hasConversation ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          accessibilityLabel="Continue conversation"
          onPress={() => onViewChange(true)}
        >
          <Text className="text-sm font-urbanist-medium text-muted-foreground">
            {streaming ? "Cookkit is replying…" : "Continue conversation"}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}
