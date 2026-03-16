import React, { useEffect, useMemo, useRef } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import type { Recipe } from "~/types/Recipe";
import { LegendList } from "@legendapp/list";
import { useImagePreloader } from "~/hooks/useImagePreloader";

interface RecipeCarouselProps {
  recipes: Recipe[];
  onIndexChange?: (index: number) => void;
  onPressItem?: (recipe: Recipe, index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_SPACING = 16;
const ITEM_WIDTH = Math.round(SCREEN_WIDTH * 0.78);
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;
const PRELOAD_RADIUS = 2;

export default function RecipeCarousel({
  recipes,
  onIndexChange,
  onPressItem,
}: RecipeCarouselProps) {
  const { prefetch } = useImagePreloader({ priority: "low", delay: 50 });
  const dataRef = useRef({ recipes, prefetch });
  dataRef.current = { recipes, prefetch };

  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 60 }),
    []
  );
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const first = viewableItems.find((v) => v.index != null);
      if (first?.index != null) {
        onIndexChange?.(first.index);
        const { recipes: r, prefetch: p } = dataRef.current;
        const current = first.index;
        const start = Math.max(0, current - PRELOAD_RADIUS);
        const end = Math.min(r.length, current + PRELOAD_RADIUS + 1);
        const urls = r
          .slice(start, end)
          .map((recipe) => recipe.imageUrl)
          .filter(Boolean);
        if (urls.length > 0) p(urls);
      }
    }
  );

  useEffect(() => {
    const urls = recipes
      .slice(0, 3)
      .map((r) => r.imageUrl)
      .filter(Boolean);
    if (urls.length > 0) prefetch(urls);
  }, [recipes, prefetch]);

  return (
    <LegendList
      keyExtractor={(item) => item.id}
      data={recipes}
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
