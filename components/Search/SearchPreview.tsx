import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { P } from "~/components/ui/typography";
import { AssistantStarters } from "~/components/Assistant/AssistantStarters";

/** Keep the entrance light: no catalog requests or AI calls until an explicit action. */
export function SearchPreview({
  top: contentTop,
  onAsk,
  disabled = false,
}: {
  top?: number;
  onAsk?: (question: string) => void;
  disabled?: boolean;
}) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View
      testID="search-preview"
      className="flex-1"
      style={{ paddingTop: (contentTop ?? top) + 10, paddingBottom: bottom + 64 }}
    >
      <View className="px-6 pt-8 gap-5">
        <P className="text-sm font-urbanist-medium text-muted-foreground">
          Search your pantry and recipes.
        </P>
        {onAsk ? (
          <AssistantStarters onAsk={onAsk} disabled={disabled} title="Need a hand?" />
        ) : null}
      </View>
    </View>
  );
}
