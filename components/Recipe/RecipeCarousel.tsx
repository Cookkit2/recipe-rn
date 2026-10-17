import React, { useCallback, useEffect, useRef } from "react";
import { useWindowDimensions, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import type { Recipe } from "~/types/Recipe";
import RecyclingList from "~/components/Shared/RecyclingList";
import { useImagePreloader } from "~/hooks/useImagePreloader";

interface RecipeCarouselProps {
  recipes: Recipe[];
  onIndexChange?: (index: number) => void;
  onPressItem?: (recipe: Recipe, index: number) => void;
}

const ITEM_SPACING = 16;
const PRELOAD_RADIUS = 2;

export default function RecipeCarousel({
  recipes,
  onIndexChange,
  onPressItem,
}: RecipeCarouselProps) {
  const { width } = useWindowDimensions();
  const itemWidth = Math.round(width * 0.78);
  const imageHeight = Math.round(width * 0.9);
  const { prefetch } = useImagePreloader({ priority: "low", delay: 50 });
  const dataRef = useRef({ recipes, prefetch, onIndexChange });
  dataRef.current = { recipes, prefetch, onIndexChange };
  const onActiveItemChange = useCallback((index: number) => {
    const current = dataRef.current;
    current.onIndexChange?.(index);
    const urls = current.recipes
      .slice(Math.max(0, index - PRELOAD_RADIUS), index + PRELOAD_RADIUS + 1)
      .map((recipe) => recipe.imageUrl)
      .filter(Boolean);
    if (urls.length > 0) current.prefetch(urls);
  }, []);

  const renderRecipe = useCallback(
    ({ item, index }: { item: Recipe; index: number }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => onPressItem?.(item, index)}
        style={{ width: itemWidth }}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={[styles.image, { height: imageHeight }]}
          contentFit="cover"
          transition={{ duration: 200, skipOnCacheHit: "all" }}
        />
      </Pressable>
    ),
    [onPressItem, itemWidth, imageHeight]
  );

  useEffect(() => {
    const urls = recipes
      .slice(0, 3)
      .map((r) => r.imageUrl)
      .filter(Boolean);
    if (urls.length > 0) prefetch(urls);
  }, [recipes, prefetch]);

  return (
    <RecyclingList
      keyExtractor={(item) => item.id}
      data={recipes}
      horizontal
      itemSize={itemWidth}
      itemSpacing={ITEM_SPACING}
      snapToItems
      style={{ height: imageHeight }}
      contentPadding={{ left: ITEM_SPACING, right: ITEM_SPACING }}
      onActiveItemChange={onActiveItemChange}
      renderItem={renderRecipe}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    borderRadius: 24,
    borderCurve: "continuous",
  },
});
