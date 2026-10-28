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
}: {
  onAsk: (question: string) => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <View className="gap-3 pt-2">
      <Text className="text-base font-urbanist-semibold">{title}</Text>
      {COOKKIT_STARTERS.map(({ label, question }) => (
        <Button
          key={label}
          variant="secondary"
          className="items-start rounded-2xl"
          accessibilityLabel={label}
          disabled={disabled}
          onPress={() => onAsk(question)}
        >
          <Text className="font-urbanist-medium">{label}</Text>
        </Button>
      ))}
    </View>
  );
}
