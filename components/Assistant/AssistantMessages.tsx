import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { Text } from "~/components/ui/text";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { TEST_IDS } from "~/constants/test-ids";
import type { CookingChatMessage } from "~/hooks/useCookingAgentChat";
import type { Recipe } from "~/types/Recipe";
import type { PantryAdditionReceipt } from "~/lib/agent/pantry-action";
import { hideStockIds } from "~/lib/agent/stock-id-display";
import { toAssistantPlainText } from "~/lib/agent/plain-text";
import { RecipeSuggestions } from "./RecipeSuggestions";
import { PantryActionCard } from "./PantryActionCard";
import { AssistantStarters } from "./AssistantStarters";
import { IS_E2E } from "~/utils/e2e-flags";

interface MessageActions {
  onOpenRecipe?: (id: string) => void;
  onReply?: (text: string) => void;
  onViewPantry?: () => void;
  onUndo?: (receipt: PantryAdditionReceipt) => Promise<void>;
}
function MessageBubble({
  message,
  stockIds,
  recipes,
  streaming,
  retryText,
  choiceLabel,
  onOpenRecipe,
  onReply,
  onViewPantry,
  onUndo,
}: MessageActions & {
  message: CookingChatMessage;
  stockIds: readonly string[];
  recipes: readonly Recipe[];
  streaming: boolean;
  retryText?: string;
  choiceLabel?: string;
}) {
  const mine = message.role === "user";
  const displayContent = mine
    ? (choiceLabel ?? hideStockIds(message.content, stockIds))
    : toAssistantPlainText(message.content.replace(/^Entry \d+:.*$/gm, "").trim(), stockIds);
  const error = toAssistantPlainText(message.pantryError ?? message.error ?? "", stockIds);
  const activity = message.activities.filter((item) => item.endsWith("…")).at(-1) ?? "Thinking…";
  const retryable =
    error &&
    !streaming &&
    !message.pantryError &&
    !message.pantryActions?.length &&
    !message.activities.some((item) =>
      /^(Added to pantry|Updated pantry|Removed from pantry)$/.test(item)
    );
  return (
    <View
      testID={mine ? undefined : TEST_IDS.assistant.bubble}
      className={mine ? "items-end" : "gap-3"}
    >
      {displayContent ? (
        <View className={mine ? "max-w-[85%] rounded-2xl bg-secondary px-4 py-3" : "w-full"}>
          <Text className="text-left font-urbanist-medium leading-6" selectable>
            {displayContent}
          </Text>
        </View>
      ) : null}
      {!mine && message.recipeSuggestions ? (
        <RecipeSuggestions
          result={message.recipeSuggestions}
          recipes={recipes}
          onOpenRecipe={onOpenRecipe}
          stockIds={stockIds}
        />
      ) : null}
      {!mine
        ? message.pantryActions?.map((action) => (
            <PantryActionCard
              key={action.id}
              action={action}
              onViewPantry={onViewPantry}
              onUndo={onUndo}
            />
          ))
        : null}
      {!mine && message.pantryClarification?.candidates?.length ? (
        <View className="gap-2">
          {message.pantryClarification.candidates.map((candidate, index) => (
            <Button
              key={candidate.id}
              variant="secondary"
              className="h-auto native:h-auto min-h-12 items-start rounded-2xl"
              disabled={streaming || !onReply}
              accessibilityLabel={`Choose ${candidate.name}, ${candidate.quantity} ${candidate.unit}${candidate.storageType ? `, ${candidate.storageType}` : ""}`}
              onPress={() => onReply?.(`Entry ${index + 1}`)}
            >
              <Text className="font-urbanist-semibold">{candidate.name}</Text>
              <Text className="font-urbanist-medium text-sm text-muted-foreground">
                {candidate.quantity} {candidate.unit}
                {candidate.storageType ? ` · ${candidate.storageType}` : ""}
                {candidate.expiryDate ? ` · expires ${candidate.expiryDate.slice(0, 10)}` : ""}
              </Text>
            </Button>
          ))}
        </View>
      ) : null}
      {!mine && streaming ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" />
          <P
            accessibilityLiveRegion="polite"
            className="text-sm font-urbanist-medium text-muted-foreground"
          >
            {activity}
          </P>
        </View>
      ) : null}
      {!mine && error ? (
        <View className="gap-1">
          <P
            accessibilityLiveRegion="polite"
            className="text-sm font-urbanist-medium text-destructive"
          >
            {error}
          </P>
          {retryable && retryText && onReply ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-start -ml-3"
              accessibilityLabel="Retry message"
              onPress={() => onReply(retryText)}
            >
              <Text className="font-urbanist-semibold text-sm">Retry</Text>
            </Button>
          ) : message.pantryError && onViewPantry ? (
            <Button variant="ghost" size="sm" className="self-start -ml-3" onPress={onViewPantry}>
              <Text className="font-urbanist-semibold text-sm">Review pantry</Text>
            </Button>
          ) : null}
        </View>
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
  recipes = [],
  streaming = false,
  onReply,
  onViewPantry,
  onUndo,
}: MessageActions & {
  messages: CookingChatMessage[];
  top?: number;
  bottom?: number;
  adjustKeyboardInsets?: boolean;
  recipes?: readonly Recipe[];
  streaming?: boolean;
}) {
  const listRef = useRef<FlatList<CookingChatMessage>>(null);
  const nearBottom = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const stockIds = [...new Set(messages.flatMap((message) => message.internalStockIds ?? []))];
  const latestUser = messages.filter((message) => message.role === "user").at(-1)?.id;
  useEffect(() => {
    nearBottom.current = true;
    setShowLatest(false);
  }, [latestUser]);
  return (
    <View className="flex-1">
      <FlatList
        className="flex-1"
        ref={listRef}
        testID={TEST_IDS.assistant.list}
        data={messages}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets={adjustKeyboardInsets}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 px-5"
        contentContainerStyle={{ paddingTop: top, paddingBottom: bottom }}
        ListEmptyComponent={
          onReply ? (
            <AssistantStarters onAsk={onReply} disabled={streaming} />
          ) : (
            <P className="pt-8 font-urbanist-medium text-muted-foreground">
              What would you like to cook?
            </P>
          )
        }
        scrollEventThrottle={16}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          nearBottom.current = contentSize.height - layoutMeasurement.height - contentOffset.y < 80;
          if (nearBottom.current) setShowLatest(false);
        }}
        onContentSizeChange={() => {
          if (nearBottom.current) listRef.current?.scrollToEnd({ animated: !IS_E2E && !streaming });
          else setShowLatest(true);
        }}
        renderItem={({ item, index }) => {
          const previous = messages[index - 1];
          const choice = item.role === "user" ? /^Entry (\d+)$/.exec(item.content) : null;
          const candidate = choice
            ? previous?.pantryClarification?.candidates?.[Number(choice[1]) - 1]
            : undefined;
          const question = messages
            .slice(0, index)
            .filter((message) => message.role === "user")
            .at(-1)?.content;
          return (
            <MessageBubble
              message={item}
              stockIds={stockIds}
              recipes={recipes}
              streaming={streaming && index === messages.length - 1}
              retryText={question}
              choiceLabel={
                candidate
                  ? `${candidate.name} · ${candidate.quantity} ${candidate.unit}${candidate.storageType ? ` · ${candidate.storageType}` : ""}`
                  : undefined
              }
              onOpenRecipe={onOpenRecipe}
              onReply={onReply}
              onViewPantry={onViewPantry}
              onUndo={onUndo}
            />
          );
        }}
      />
      {showLatest ? (
        <View className="absolute bottom-3 self-center">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            accessibilityLabel="Jump to latest message"
            onPress={() => {
              nearBottom.current = true;
              setShowLatest(false);
              listRef.current?.scrollToEnd({ animated: !IS_E2E });
            }}
          >
            <Text className="font-urbanist-semibold text-sm">Latest message ↓</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
}
