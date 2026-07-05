import React, { useCallback, useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { H4, P } from "~/components/ui/typography";
import RecipeItemCard from "./RecipeItemCard";
import { useExpiringRecipes, type RecipeWithCompletion } from "~/hooks/queries/useRecipeQueries";
import { storage } from "~/data";
import { EXPIRING_RECIPES_DISMISSED_AT_KEY } from "~/constants/storage-keys";
import { XIcon, AlertCircleIcon, RefreshCwIcon } from "lucide-uniwind";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { LegendList } from "@legendapp/list";

const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RECIPES_TO_SHOW = 4;

// Loading skeleton component
function LoadingSkeleton() {
  const { width } = useWindowDimensions();
  const paddingHorizontal = 12 * 2; // px-3
  const gap = 8; // gap-2
  const cardWidth = (width - paddingHorizontal - gap) / 2;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      {/* Header skeleton */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="h-5 w-24 bg-muted/50 rounded animate-pulse" />
            <View className="bg-muted/50 px-2 py-0.5 rounded-full">
              <View className="h-3 w-12 bg-muted/70 rounded" />
            </View>
          </View>
          <View className="h-3 w-48 bg-muted/50 rounded mt-2" />
        </View>
        <View className="h-6 w-6 bg-muted/50 rounded-full" />
      </View>

      {/* Recipe cards skeleton */}
      <View className="flex-row flex-wrap px-3 pt-2 gap-2">
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={{ width: cardWidth }}>
            <View className="bg-card rounded-lg overflow-hidden">
              <View className="aspect-square bg-muted/50 animate-pulse" />
              <View className="p-2 gap-1">
                <View className="h-4 bg-muted/50 rounded w-3/4" />
                <View className="h-3 bg-muted/30 rounded w-1/2 mt-1" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// Error state component
function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      {/* Header with error indicator */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <H4 className="text-foreground font-urbanist-semibold">Cook Now</H4>
            <AlertCircleIcon size={16} className="text-destructive" strokeWidth={2} />
          </View>
          <P className="text-destructive font-urbanist-regular text-sm mt-0.5">
            {error.message || "Failed to load recipes"}
          </P>
        </View>
        <Button
          variant="ghost"
          size="icon-sm"
          onPress={onRetry}
          accessibilityLabel="Retry loading recipes"
        >
          <RefreshCwIcon size={16} className="text-muted-foreground" strokeWidth={2} />
        </Button>
      </View>

      {/* Retry prompt */}
      <View className="px-4 py-4 items-center">
        <P className="text-muted-foreground text-center text-sm">
          Tap to retry loading expiring recipes
        </P>
      </View>
    </Animated.View>
  );
}

export default function ExpiringRecipesSection() {
  const [isDismissed, setIsDismissed] = useState(false);

  const { recipes, expiringIngredientIds, isLoading, error, refetch } = useExpiringRecipes({
    maxRecommendations: MAX_RECIPES_TO_SHOW,
  });

  const expiringCount = expiringIngredientIds.size;

  // Check if section was dismissed and if dismiss period has expired
  useEffect(() => {
    const checkDismissedState = async () => {
      const dismissedAt = await storage.get<number>(EXPIRING_RECIPES_DISMISSED_AT_KEY, true);
      if (dismissedAt) {
        const dismissedTime = typeof dismissedAt === "number" ? dismissedAt : 0;
        const now = Date.now();
        if (now - dismissedTime < DISMISS_DURATION_MS) {
          setIsDismissed(true);
        } else {
          // Dismiss period expired, clear the storage
          await storage.delete(EXPIRING_RECIPES_DISMISSED_AT_KEY, true);
          setIsDismissed(false);
        }
      }
    };

    checkDismissedState();
  }, []);

  const handleRetry = useCallback(() => {
    refetch?.();
  }, [refetch]);

  // Show loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Show error state
  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} />;
  }

  // Don't render if dismissed or no recipes/expiring ingredients
  if (isDismissed || recipes.length === 0 || expiringCount === 0) {
    return null;
  }

  const handleDismiss = useCallback(async () => {
    await storage.set(EXPIRING_RECIPES_DISMISSED_AT_KEY, Date.now(), true);
    setIsDismissed(true);
  }, []);

  // Memoized render item to prevent re-creation on each render
  const renderRecipeItem = useCallback(
    ({ item }: { item: RecipeWithCompletion }) => (
      <RecipeItemCard recipe={item.recipe} completionPercentage={item.completionPercentage} />
    ),
    []
  );

  // Approximate item height for estimatedItemSize (image is square + text below)
  const ITEM_HEIGHT = 200;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      {/* Header with dismiss button */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <H4 className="text-foreground font-urbanist-semibold">Cook Now</H4>
            <View className="bg-orange-500/20 px-2 py-0.5 rounded-full">
              <P className="text-orange-500 font-urbanist-semibold text-xs">
                {expiringCount} expiring
              </P>
            </View>
          </View>
          <P className="text-muted-foreground font-urbanist-regular text-sm mt-0.5">
            Use these ingredients before they go bad
          </P>
        </View>
        <Button
          variant="ghost"
          size="icon-sm"
          onPress={handleDismiss}
          accessibilityLabel="Dismiss Cook Now section"
          accessibilityHint="Hide this section for 24 hours"
        >
          <XIcon size={16} className="text-muted-foreground" strokeWidth={2.5} />
        </Button>
      </View>

      {/* Recipe list */}
      <LegendList
        keyExtractor={(item) => item.recipe.id.toString()}
        numColumns={2}
        style={{ paddingHorizontal: 12, paddingTop: 8, maxHeight: ITEM_HEIGHT * 2 }}
        showsVerticalScrollIndicator={false}
        data={recipes}
        renderItem={renderRecipeItem}
        recycleItems
        estimatedItemSize={ITEM_HEIGHT}
        horizontal={false}
      />
    </Animated.View>
  );
}
