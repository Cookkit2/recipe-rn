import { useRef } from "react";
import { FlatList, View } from "react-native";
import { Text } from "~/components/ui/text";
import { P } from "~/components/ui/typography";
import { TEST_IDS } from "~/constants/test-ids";
import type { CookingChatMessage } from "~/hooks/useCookingAgentChat";
import { hideStockIds } from "~/lib/agent/stock-id-display";
import { toAssistantPlainText } from "~/lib/agent/plain-text";
import { RecipeSuggestions } from "./RecipeSuggestions";
import { IS_E2E } from "~/utils/e2e-flags";

function MessageBubble({
  message,
  onOpenRecipe,
  stockIds,
}: {
  stockIds: readonly string[];
  message: CookingChatMessage;
  onOpenRecipe?: (id: string) => void;
}) {
  const mine = message.role === "user";
  const displayContent = mine
    ? hideStockIds(message.content, stockIds)
    : toAssistantPlainText(message.content, stockIds);
  const secondaryError = toAssistantPlainText(message.pantryError ?? message.error ?? "", stockIds);
  return (
    <View
      testID={mine ? undefined : TEST_IDS.assistant.bubble}
      className={mine ? "items-end" : "items-start"}
    >
      <View
        className={
          mine
            ? "max-w-[85%] rounded-2xl bg-primary px-4 py-3"
            : "max-w-[85%] rounded-2xl bg-muted px-4 py-3"
        }
      >
        {message.recipeSuggestions ? (
          <View className="gap-3">
            {displayContent ? <Text className="text-left">{displayContent}</Text> : null}
            <RecipeSuggestions
              result={message.recipeSuggestions}
              onOpenRecipe={onOpenRecipe}
              stockIds={stockIds}
            />
          </View>
        ) : (
          <Text className={mine ? "text-primary-foreground text-left" : "text-left"}>
            {displayContent ||
              toAssistantPlainText(message.error ?? "", stockIds) ||
              (message.role === "assistant" ? "…" : "")}
          </Text>
        )}
      </View>
      {message.activities.map((activity, index) => (
        <P key={`${activity}-${index}`} className="mt-1 text-sm text-muted-foreground">
          {toAssistantPlainText(activity, stockIds)}
        </P>
      ))}
      {secondaryError &&
      (message.content || message.recipeSuggestions || secondaryError !== message.error) ? (
        <P className="mt-1 text-sm text-destructive">{secondaryError}</P>
      ) : null}
    </View>
  );
}

export function AssistantMessages({
  messages,
  top = 12,
  bottom = 12,
  onOpenRecipe,
  adjustKeyboardInsets = false,
}: {
  messages: CookingChatMessage[];
  top?: number;
  bottom?: number;
  onOpenRecipe?: (id: string) => void;
  adjustKeyboardInsets?: boolean;
}) {
  const listRef = useRef<FlatList<CookingChatMessage>>(null);
  const stockIds = [...new Set(messages.flatMap((message) => message.internalStockIds ?? []))];
  return (
    <FlatList
      className="flex-1 overflow-hidden"
      ref={listRef}
      testID={TEST_IDS.assistant.list}
      data={messages}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets={adjustKeyboardInsets}
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-3 px-4"
      contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}
      ListEmptyComponent={
        <P className="px-2 pt-8 text-muted-foreground">Ask what to cook from your fridge.</P>
      }
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: !IS_E2E })}
      renderItem={({ item }) => (
        <MessageBubble message={item} onOpenRecipe={onOpenRecipe} stockIds={stockIds} />
      )}
    />
  );
}
