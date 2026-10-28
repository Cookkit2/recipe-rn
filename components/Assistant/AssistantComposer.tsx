import { View } from "react-native";
import { ArrowUpIcon, SquareIcon } from "lucide-uniwind";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { TEST_IDS } from "~/constants/test-ids";

export function AssistantComposer({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  bottom,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  bottom: number;
}) {
  return (
    <View className="bg-background px-5 pt-3" style={{ paddingBottom: Math.max(bottom, 12) }}>
      <View className="flex-row items-end gap-2 rounded-3xl bg-muted p-2">
        <Input
          testID={TEST_IDS.assistant.composer}
          accessibilityLabel="Message Cookkit"
          placeholder="Ask a follow-up…"
          className="flex-1 rounded-2xl bg-transparent text-left font-urbanist-medium"
          style={{ minHeight: 44, maxHeight: 120 }}
          value={value}
          onChangeText={onChange}
          multiline
          returnKeyType="send"
          submitBehavior="submit"
          onSubmitEditing={() => {
            if (!streaming && value.trim()) onSend();
          }}
        />
        <Button
          testID={TEST_IDS.assistant.send}
          accessibilityLabel={streaming ? "Stop Cookkit" : "Send message"}
          size="icon-lg"
          className="rounded-full"
          disabled={!streaming && !value.trim()}
          onPress={streaming ? onStop : onSend}
        >
          {streaming ? (
            <SquareIcon size={18} className="text-primary-foreground" />
          ) : (
            <ArrowUpIcon size={22} className="text-primary-foreground" />
          )}
        </Button>
      </View>
    </View>
  );
}
