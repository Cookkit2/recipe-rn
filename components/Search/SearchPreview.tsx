import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { P } from "~/components/ui/typography";

/** Pre-render the empty visual state without starting recipe queries or mounting an input. */
export function SearchPreview({ top: contentTop }: { top?: number }) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View
      testID="search-preview"
      className="flex-1"
      style={{ paddingTop: (contentTop ?? top) + 10, paddingBottom: bottom + 64 }}
    >
      <View className="items-center px-6 py-8">
        <P className="text-sm text-muted-foreground text-center">
          Search ingredients and recipes, or ask about your pantry.
        </P>
      </View>
    </View>
  );
}
