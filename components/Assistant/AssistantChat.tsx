import { useCallback, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { P } from "~/components/ui/typography";
import { TEST_IDS } from "~/constants/test-ids";
import { useCookingAgentChat, type CookingChatMessage } from "~/hooks/useCookingAgentChat";
import type { CookingAgent } from "~/lib/agent/types";
import { IS_E2E } from "~/utils/e2e-flags";

function MessageBubble({ message }: { message: CookingChatMessage }) {
  const mine = message.role === "user";
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
        <Text className={mine ? "text-primary-foreground text-left" : "text-left"}>
          {message.content || message.error || (message.role === "assistant" ? "…" : "")}
        </Text>
      </View>
      {message.activities.map((activity, index) => (
        <P key={`${activity}-${index}`} className="mt-1 text-sm text-muted-foreground">
          {activity}
        </P>
      ))}
      {message.error && message.content ? (
        <P className="mt-1 text-sm text-destructive">{message.error}</P>
      ) : null}
    </View>
  );
}

export function AssistantChat({ agent }: { agent: CookingAgent }) {
  const { messages, status, send, stop } = useCookingAgentChat(agent);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<CookingChatMessage>>(null);
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const streaming = status === "streaming";

  const onSend = useCallback(() => {
    const text = draft;
    setDraft("");
    void send(text);
  }, [draft, send]);

  return (
    <KeyboardAvoidingView
      testID={TEST_IDS.assistant.screen}
      collapsable={false}
      className="flex-1 bg-background"
      keyboardVerticalOffset={headerHeight}
      style={{ flex: 1 }}
      // iOS keyboard-frame notifications on the simulator keep this padding
      // animating, which holds the main run loop awake and leaves the bottom
      // field under Detox's 75% visibility threshold. The Detox build types
      // into a stable composer instead.
      behavior={Platform.OS === "ios" && !IS_E2E ? "padding" : undefined}
    >
      <FlatList
        className="flex-1 overflow-hidden"
        ref={listRef}
        testID={TEST_IDS.assistant.list}
        data={messages}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-3 px-4 py-4"
        ListEmptyComponent={
          <P className="px-2 pt-8 text-muted-foreground">Ask what to cook from your fridge.</P>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />
      <View
        className="flex-row items-end gap-2 border-t border-border px-4 pt-3"
        style={{ paddingBottom: bottom + 12, flexShrink: 0 }}
      >
        <Input
          className="flex-1 text-left text-foreground"
          style={{ minHeight: 48 }}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about your fridge"
          accessibilityLabel="Message"
          testID={TEST_IDS.assistant.composer}
          editable={!streaming}
          multiline
          onSubmitEditing={onSend}
        />
        <Button
          accessibilityLabel={streaming ? "Stop" : "Send"}
          testID={TEST_IDS.assistant.send}
          onPress={streaming ? stop : onSend}
          disabled={!streaming && draft.trim().length === 0}
        >
          <Text>{streaming ? "Stop" : "Send"}</Text>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
