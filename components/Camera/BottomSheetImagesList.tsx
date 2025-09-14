import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { P } from "~/components/ui/typography";
import useColors from "~/hooks/useColor";

export default function BottomSheetImagesList() {
  const colors = useColors();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const handleSheetChanges = useCallback((_index: number) => {
    // Bottom sheet changed to index: _index
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={["25%", "80%"]}
      onChange={handleSheetChanges}
      backgroundStyle={[
        styles.bottomSheetBackground,
        {
          // backgroundColor: "transparent",
          backgroundColor: colors.cardForeground,
        },
      ]}
      handleIndicatorStyle={[
        styles.bottomSheetIndicator,
        {
          backgroundColor: colors.primary,
        },
      ]}
      enableDynamicSizing={false}
    >
      <BottomSheetView className="flex-1 p-6">
        <View>
          <P>Images</P>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

// Dynamic styles based on theme
const styles = StyleSheet.create({
  bottomSheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomSheetIndicator: {
    width: 40,
    height: 4,
  },
});
