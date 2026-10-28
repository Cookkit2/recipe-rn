import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SearchHelperText } from "./SearchHelperText";

/** Keep the entrance light: no catalog requests or AI calls until an explicit action. */
export function SearchPreview({ top: contentTop }: { top?: number }) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View
      testID="search-preview"
      className="flex-1"
      style={{ paddingTop: (contentTop ?? top) + 10, paddingBottom: bottom + 64 }}
    >
      <View className="items-center px-6 py-8">
        <SearchHelperText>Search your pantry and recipes.</SearchHelperText>
      </View>
    </View>
  );
}
