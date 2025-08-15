import React, { useMemo, useRef } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { Recipe } from "~/types/Recipe";

interface RecipeCarouselProps {
  recipes: Recipe[];
  onIndexChange?: (index: number) => void;
  onPressItem?: (recipe: Recipe, index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_SPACING = 16;
const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.78);
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;

export default function RecipeCarousel({
  recipes,
  onIndexChange,
  onPressItem,
}: RecipeCarouselProps) {
  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 60 }),
    []
  );
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const first = viewableItems.find((v) => v.index != null);
      if (first?.index != null) onIndexChange?.(first.index);
    }
  );

  return (
    <FlatList
      data={recipes}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP_INTERVAL}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: ITEM_SPACING }}
      ItemSeparatorComponent={() => <View style={{ width: ITEM_SPACING }} />}
      onViewableItemsChanged={onViewableItemsChanged.current}
      viewabilityConfig={viewabilityConfig}
      renderItem={({ item, index }) => (
        <Pressable
          onPress={() => onPressItem?.(item, index)}
          style={{ width: ITEM_WIDTH }}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: Math.round(SCREEN_WIDTH * 0.9),
    borderRadius: 24,
    borderCurve: "continuous",
  },
});
