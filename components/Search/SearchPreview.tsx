import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "~/hooks/useColor";
import { SearchResultsList } from "./SearchResultsList";

const EMPTY = [] as const;

/** Pre-render the empty visual state without starting recipe queries or mounting an input. */
export function SearchPreview() {
  const { top, bottom } = useSafeAreaInsets();
  const colors = useColors();
  return (
    <View className="flex-1">
      <SearchResultsList
        recipes={EMPTY}
        ingredients={EMPTY}
        colors={colors}
        hasQuery={false}
        loading={false}
        top={top}
        bottom={bottom}
        transparent
      />
    </View>
  );
}
