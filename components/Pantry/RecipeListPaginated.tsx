import { useCallback, useMemo, useRef } from "react";
import {
  View,
  ActivityIndicator,
  Pressable,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { P } from "~/components/ui/typography";
import { LegendList } from "@legendapp/list";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useRecipesPaginated } from "~/hooks/queries/useRecipeQueries";
import { useImagePreloader } from "~/hooks/useImagePreloader";
import { CURVES } from "~/constants/curves";
import type { Recipe } from "~/types/Recipe";
import RecipeItemCard from "./RecipeItemCard";

const NUM_COLUMNS = 2;
const PRELOAD_WINDOW_SIZE = 6;
const PAGE_SIZE = 20;
const ITEM_HEIGHT = 200;

export default function RecipeListPaginated() {
  const scrollY = useSharedValue(0);
  const { prefetch } = useImagePreloader({ priority: "low", delay: 50 });
  const isFetchingNextPageRef = useRef(false);

  // Use paginated query with infinite scroll
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useRecipesPaginated(PAGE_SIZE);

  // Flatten pages into a single array
  const recipes = useMemo(() => {
    return data?.pages.flatMap((page) => page.recipes) ?? [];
  }, [data]);

  // Scroll handler
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;

      // Infinite scroll: fetch next page when near bottom
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 200; // Distance from bottom to trigger load more

      if (
        !isFetchingNextPageRef.current &&
        hasNextPage &&
        layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom
      ) {
        isFetchingNextPageRef.current = true;
        fetchNextPage().finally(() => {
          isFetchingNextPageRef.current = false;
        });
      }
    },
    [scrollY, hasNextPage, fetchNextPage]
  );

  // Border animation
  const bottomBorderStyle = useAnimatedStyle(() => ({
    borderTopWidth: withTiming(scrollY.value > 10 ? 1 : 0, CURVES["expressive.fast.effects"]),
  }));

  // Handle bar animation
  const handleBarStyle = useAnimatedStyle(() => ({
    height: scrollY.value > 10 ? 1 : 0,
  }));

  // Loading state
  if (isLoading) {
    return (
      <View className="py-16 items-center justify-center">
        <ActivityIndicator size="small" />
        <P className="mt-2 text-muted-foreground">Loading recipes...</P>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View className="py-16 items-center justify-center">
        <P className="text-destructive text-center">{error?.message ?? "Error loading recipes"}</P>
      </View>
    );
  }

  // Empty state
  if (recipes.length === 0) {
    return (
      <View className="py-16 items-center justify-center">
        <P className="text-muted-foreground font-urbanist-semibold text-center">
          No recipes available
        </P>
      </View>
    );
  }

  // Render item
  const renderRecipeItem = useCallback(
    ({ item }: { item: Recipe }) => <RecipeItemCard recipe={item} completionPercentage={100} />,
    []
  );

  // Loading indicator for next page
  const ListFooterComponent = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View className="py-4 items-center justify-center">
        <ActivityIndicator size="small" />
        <P className="mt-2 text-muted-foreground text-sm">Loading more recipes...</P>
      </View>
    );
  }, [isFetchingNextPage]);

  // End of list indicator
  const ListEndComponent = useCallback(() => {
    if (hasNextPage || isFetchingNextPage) return null;
    return (
      <View className="py-8 items-center justify-center">
        <P className="text-muted-foreground text-sm">
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} loaded
        </P>
      </View>
    );
  }, [hasNextPage, isFetchingNextPage, recipes.length]);

  return (
    <>
      <Animated.View
        className="bg-border/50 w-full rounded-full self-center mt-4 z-2"
        style={handleBarStyle}
      />
      <Animated.View className="flex-1" style={bottomBorderStyle}>
        <LegendList
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          style={{ paddingHorizontal: 12, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          data={recipes}
          renderItem={renderRecipeItem}
          onScroll={handleScroll}
          ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={null}
          recycleItems
          estimatedItemSize={ITEM_HEIGHT}
        />
        <ListEndComponent />
      </Animated.View>
    </>
  );
}
