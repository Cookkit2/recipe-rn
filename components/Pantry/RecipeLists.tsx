import RecipeItemCard from "./RecipeItemCard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ActivityIndicator,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { useRecipeStore } from "~/store/RecipeContext";
import { H4, P } from "~/components/ui/typography";
import { CURVES } from "~/constants/curves";
import {
  CompositeFilterStrategy,
  CategoryFilter,
  CompositeRankingStrategy,
  ReadinessStrategy,
  createHistoryAwareRankingStrategy,
  DietaryFilter,
} from "~/hooks/recommendation";
import { LegendList } from "@legendapp/list";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import {
  useRecipeRecommendations,
  useRecipesPaginated,
  type RecipeWithCompletion,
} from "~/hooks/queries/useRecipeQueries";
import { useImagePreloader } from "~/hooks/useImagePreloader";
import ExpiringRecipesSection from "./ExpiringRecipesSection";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NUM_COLUMNS = 2;
const PRELOAD_WINDOW_SIZE = 6;
const SCROLL_PREFETCH_THROTTLE_MS = 200;
const INITIAL_RECIPE_LIMIT = 30;
const LOAD_MORE_THRESHOLD = 10; // Load more when 10 items from bottom

export default function RecipeLists() {
  const { bottom } = useSafeAreaInsets();
  const { selectedRecipeTags } = useRecipeStore();
  const scrollY = useSharedValue(0);
  const { prefetch } = useImagePreloader({ priority: "low", delay: 50 });
  const lastPrefetchStartRef = useRef(-1);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State for progressive loading
  const [displayLimit, setDisplayLimit] = useState(INITIAL_RECIPE_LIMIT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);

  // Regular scroll handler that updates shared value (LegendList doesn't support Reanimated handlers)
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY]
  );

  // Build filter strategy based on selected categories
  // Build filter strategy based on selected categories and dietary preferences
  const dietaryFilter = useMemo(
    () =>
      new DietaryFilter({
        checkDietaryPreferences: true,
        checkAllergens: true,
        checkTagsForAllergens: true,
      }),
    []
  );

  const filterStrategy = useMemo(() => {
    const composite = new CompositeFilterStrategy().addFilter(dietaryFilter);

    if (selectedRecipeTags.length > 0) {
      composite.addFilter(new CategoryFilter({ categories: selectedRecipeTags }));
    }

    return composite;
  }, [selectedRecipeTags, dietaryFilter]);

  // Build ranking strategy
  const rankingStrategy = useMemo(() => {
    return new CompositeRankingStrategy()
      .addStrategy(createHistoryAwareRankingStrategy(), 1)
      .addStrategy(new ReadinessStrategy({ multiplier: 1 }), 1);
  }, []);

  // Fetch recipes with filtering and ranking (fetch more than we display initially)
  const { recipes, isLoading, error } = useRecipeRecommendations({
    maxRecommendations: 200, // Fetch up to 200 recipes total
    categories: selectedRecipeTags.length > 0 ? selectedRecipeTags : undefined,
    filterStrategy,
    rankingStrategy,
  });

  // Display only a subset of recipes for performance
  const displayedRecipes = useMemo(() => {
    return recipes.slice(0, displayLimit);
  }, [recipes, displayLimit]);

  // Load more function
  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current || displayLimit >= recipes.length) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    // Simulate async loading for smooth UX
    setTimeout(() => {
      setDisplayLimit((prev) => Math.min(prev + INITIAL_RECIPE_LIMIT, recipes.length));
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }, 100);
  }, [displayLimit, recipes.length]);

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(INITIAL_RECIPE_LIMIT);
  }, [selectedRecipeTags]);

  // Create display text for selected categories
  const selectedCategoriesText = useMemo(() => {
    if (selectedRecipeTags.length === 0) return "";

    const categoryLabels = {
      meal: "Meals",
      drink: "Drinks",
      dessert: "Desserts",
    };

    return selectedRecipeTags
      .map((tag) => categoryLabels[tag as keyof typeof categoryLabels] || tag)
      .join(", ");
  }, [selectedRecipeTags]);

  // Scroll offset more than 10 then show the bottom border
  const bottomBorderStyle = useAnimatedStyle(() => ({
    borderTopWidth: withTiming(scrollY.value > 10 ? 1 : 0, CURVES["expressive.fast.effects"]),
  }));

  // Animate handle bar height when scrolling
  const handleBarStyle = useAnimatedStyle(() => ({
    height: scrollY.value > 10 ? 1 : 0,
  }));

  const listData = isLoading || error ? [] : displayedRecipes;
  const hasMoreToLoad = displayLimit < recipes.length;

  // Preload first screen of recipe images when list data is available
  useEffect(() => {
    if (listData.length === 0) return;
    const urls = listData
      .slice(0, PRELOAD_WINDOW_SIZE)
      .map((item) => item.recipe.imageUrl)
      .filter(Boolean);
    if (urls.length > 0) prefetch(urls);
  }, [listData, prefetch]);

  useEffect(() => {
    return () => {
      if (throttleRef.current != null) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, []);

  // Preload images for visible + next window on scroll (throttled)
  const scheduleScrollPrefetch = useCallback(
    (contentOffsetY: number, data: RecipeWithCompletion[]) => {
      if (data.length === 0) return;
      if (throttleRef.current != null) return;
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
        const row = Math.floor(contentOffsetY / 200);
        const startIndex = Math.min(row * NUM_COLUMNS, data.length - 1);
        if (startIndex < 0) return;
        if (startIndex === lastPrefetchStartRef.current) return;
        lastPrefetchStartRef.current = startIndex;
        const endIndex = Math.min(startIndex + PRELOAD_WINDOW_SIZE, data.length);
        const urls = data
          .slice(startIndex, endIndex)
          .map((item) => item.recipe.imageUrl)
          .filter(Boolean);
        if (urls.length > 0) prefetch(urls);
      }, SCROLL_PREFETCH_THROTTLE_MS);
    },
    [prefetch]
  );

  const handleScrollWithPrefetch = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScroll(event);
      scheduleScrollPrefetch(event.nativeEvent.contentOffset.y, listData);

      // Load more recipes when near bottom
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);

      // Trigger load more when within 500px of bottom (about 2-3 items)
      if (distanceFromBottom < 500 && hasMoreToLoad && !isLoadingMoreRef.current) {
        loadMore();
      }
    },
    [
      handleScroll,
      listData,
      scheduleScrollPrefetch,
      hasMoreToLoad,
      loadMore,
      recipes.length,
      displayLimit,
    ]
  );

  const emptyState = () => {
    if (isLoading) {
      return (
        <View className="py-16 items-center justify-center">
          <ActivityIndicator size="small" />
          <P className="mt-2 text-muted-foreground">
            {selectedRecipeTags.length > 0
              ? `Loading ${selectedCategoriesText.toLowerCase()}...`
              : "Loading recipes..."}
          </P>
        </View>
      );
    }

    if (error) {
      return (
        <View className="py-16 items-center justify-center">
          <P className="text-destructive text-center">{error.message}</P>
        </View>
      );
    }

    return (
      <View className="py-16 items-center justify-center">
        <H4 className="text-muted-foreground font-urbanist-semibold text-center">
          {selectedRecipeTags.length > 0
            ? `No ${selectedCategoriesText.toLowerCase()} available`
            : "No recipes available"}
        </H4>
        <P className="text-muted-foreground font-urbanist-regular text-center text-sm mt-1">
          {selectedRecipeTags.length > 0
            ? `Try adding more ingredients for ${selectedCategoriesText.toLowerCase()} or select different categories`
            : "Try adding more ingredients to your pantry or adjust your dietary preferences"}
        </P>
      </View>
    );
  };

  // Memoized render item to prevent re-creation on each render
  const renderRecipeItem = useCallback(
    ({ item }: { item: RecipeWithCompletion }) => (
      <RecipeItemCard
        recipe={item.recipe}
        completionPercentage={item.completionPercentage}
        matchCategory={item.matchCategory}
      />
    ),
    []
  );

  // Approximate item height for estimatedItemSize (image is square + text below)
  const ITEM_HEIGHT = 200;

  // Footer component for loading more indicator
  const ListFooter = useCallback(() => {
    // Don't show footer if we're still loading initial data
    if (isLoading) return null;

    // Show all recipes loaded message if we have recipes but no more to load
    if (!hasMoreToLoad && recipes.length > 0) {
      return (
        <View className="py-6 items-center justify-center">
          <P className="text-muted-foreground text-sm">
            You've seen all {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
          </P>
        </View>
      );
    }

    // Show loading indicator
    if (isLoadingMore) {
      return (
        <View className="py-4 items-center justify-center">
          <ActivityIndicator size="small" />
          <P className="mt-2 text-muted-foreground text-sm">Loading more recipes...</P>
        </View>
      );
    }

    return null;
  }, [isLoading, isLoadingMore, hasMoreToLoad, recipes.length]);

  return (
    <>
      <Animated.View
        className="bg-border/50 w-full rounded-full self-center mt-4 z-2"
        style={handleBarStyle}
      />
      <Animated.View className="flex-1" style={bottomBorderStyle}>
        <ExpiringRecipesSection />
        <LegendList
          keyExtractor={(item) => item.recipe.id.toString()}
          numColumns={2}
          style={{ paddingHorizontal: 12, paddingTop: 8 }}
          contentContainerStyle={{ paddingBottom: bottom + 200 }}
          showsVerticalScrollIndicator={false}
          data={listData}
          renderItem={renderRecipeItem}
          ListEmptyComponent={emptyState}
          ListFooterComponent={ListFooter}
          // LegendList performance optimizations
          recycleItems
          estimatedItemSize={ITEM_HEIGHT}
          onScroll={handleScrollWithPrefetch}
        />
      </Animated.View>
    </>
  );
}
