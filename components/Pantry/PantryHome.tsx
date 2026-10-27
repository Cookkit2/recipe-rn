import { Platform } from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePantryPullSearch } from "~/hooks/usePantryPullSearch";
import { usePantryStore } from "~/store/PantryContext";
import PantryHeader from "./PantryHeader";
import PantryWrapper from "./PantryWrapper";

export default function PantryHome() {
  const { isRecipeOpen } = usePantryStore();
  const { top } = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const pullSearch = usePantryPullSearch(
    !isRecipeOpen,
    Platform.OS === "ios" ? -Math.max(0, headerHeight - top) : 0
  );
  return (
    <>
      <PantryHeader pullSearch={pullSearch} />
      <PantryWrapper pullSearch={pullSearch} />
    </>
  );
}
