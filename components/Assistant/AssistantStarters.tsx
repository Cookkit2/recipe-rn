import { View } from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";

const COOKKIT_STARTERS = [
  { label: "What can I cook?", question: "What can I cook with the ingredients in my pantry?" },
  {
    label: "Use food expiring soon",
    question: "What can I cook using the food expiring soon in my pantry?",
  },
  { label: "Find a quick dinner", question: "Suggest a quick dinner using my pantry ingredients." },
] as const;

export function AssistantStarters({
  onAsk,
  disabled = false,
  title = "What would you like to cook?",
  compact = false,
}: {
  onAsk: (question: string) => void;
  disabled?: boolean;
  title?: string | null;
  compact?: boolean;
}) {
  return (
    <View className="gap-3 pt-2">
      {title ? <Text className="text-base font-urbanist-semibold">{title}</Text> : null}
      <View
        testID="assistant-starter-options"
        className={compact ? "flex-row flex-wrap gap-2" : "gap-3"}
      >
        {COOKKIT_STARTERS.map(({ label, question }) => (
          <Button
            key={label}
            variant="secondary"
            size={compact ? "sm" : "default"}
            className={
              compact
                ? "h-auto native:h-auto min-h-10 max-w-full items-start rounded-2xl px-3 py-2"
                : "items-start rounded-2xl"
            }
            accessibilityLabel={label}
            disabled={disabled}
            onPress={() => onAsk(question)}
          >
            <Text
              className={
                compact
                  ? "text-sm native:text-sm font-urbanist-medium shrink"
                  : "font-urbanist-medium"
              }
            >
              {label}
            </Text>
          </Button>
        ))}
      </View>
    </View>
  );
}
