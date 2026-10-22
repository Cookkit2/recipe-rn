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

const COMPOSER_HEIGHT = 48;
// iPhone Air's home indicator is 34pt. useSafeAreaInsets() can still report 0
// while UIKit is correcting the iOS 26 navigation-bar frame.
const HOME_INDICATOR_FALLBACK = 34;

export function AssistantChat({ agent }: { agent: CookingAgent }) {
  const { messages, status, send, stop } = useCookingAgentChat(agent);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<CookingChatMessage>>(null);
  const { bottom } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const streaming = status === "streaming";
  const composerClearance = Math.max(bottom, HOME_INDICATOR_FALLBACK) + 12;

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
      // Keyboard-frame notifications on the simulator keep padding in flux.
      // E2E types into a field that does not move.
      behavior={Platform.OS === "ios" && !IS_E2E ? "padding" : undefined}
      enabled={!IS_E2E}
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
        contentContainerClassName="gap-3 px-4"
        contentContainerStyle={{
          // The opaque native header already reserves the top safe area.
          paddingTop: 12,
          paddingBottom: COMPOSER_HEIGHT + 12 + composerClearance,
        }}
        ListEmptyComponent={
          <P className="px-2 pt-8 text-muted-foreground">Ask what to cook from your fridge.</P>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: !IS_E2E })}
        renderItem={({ item }) => <MessageBubble message={item} />}
      />
      <View
        className="flex-row items-end gap-2 border-t border-border bg-background px-4 pt-3"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          paddingBottom: composerClearance,
          flexShrink: 0,
        }}
      >
        <Input
          className="flex-1 text-left text-foreground"
          style={{ height: COMPOSER_HEIGHT, maxHeight: COMPOSER_HEIGHT }}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about your fridge"
          accessibilityLabel="Message"
          testID={TEST_IDS.assistant.composer}
          editable={!streaming}
          // A multiline field is a UITextView (a scroll view). Detox matches
          // that inner view, and its frame is not counted 75% visible at the
          // bottom of a full-bleed iOS 26 screen. A fixed single-line field
          // has the same frame as its accessibility element.
          multiline={false}
          scrollEnabled={false}
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
