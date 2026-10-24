import { useCallback, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Text } from "~/components/ui/text";
import { P } from "~/components/ui/typography";
import { useCookingAgentChat, type CookingChatMessage } from "~/hooks/useCookingAgentChat";
import type { CookingAgent } from "~/lib/agent/types";

function MessageBubble({ message }: { message: CookingChatMessage }) {
  const mine = message.role === "user";
  return (
    <View className={mine ? "items-end" : "items-start"}>
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
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        className="flex-1 overflow-hidden"
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="never"
        contentContainerClassName="gap-3 px-4 py-4"
        ListEmptyComponent={
          <P className="px-2 pt-8 text-muted-foreground">Ask what to cook from your fridge.</P>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />
      <View
        className="flex-row items-end gap-2 border-t border-border px-4 pt-3"
        style={{ paddingBottom: Math.max(bottom, 12) }}
      >
        <Input
          className="flex-1 text-left text-foreground"
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about your fridge"
          accessibilityLabel="Message"
          editable={!streaming}
          multiline
          onSubmitEditing={onSend}
        />
        <Button
          accessibilityLabel={streaming ? "Stop" : "Send"}
          onPress={streaming ? stop : onSend}
          disabled={!streaming && draft.trim().length === 0}
        >
          <Text>{streaming ? "Stop" : "Send"}</Text>
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
