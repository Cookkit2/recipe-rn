import React, { useCallback, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePantryStore } from "~/store/PantryContext";
import IngredientItemCard from "./IngredientItemCard";
import { View, ActivityIndicator, RefreshControl } from "react-native";
import { H4, P } from "~/components/ui/typography";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { LinearTransition, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { CURVES } from "~/constants/curves";
import IngredientCategoryButtonGroup from "./IngredientCategoryButtonGroup";

export default function IngredientLists() {
  const { bottom } = useSafeAreaInsets();
  const { selectedItemType, ingredientScrollRef, isRecipeOpen } = usePantryStore();
  const { data, isLoading, error } = usePantryItemsByType(selectedItemType);
  const items = data ?? [];
  // const router = useRouter();

  // const [isRefreshing, setIsRefreshing] = useState(false);

  const ingredientListStyle = useAnimatedStyle(() => ({
    paddingHorizontal: withTiming(isRecipeOpen ? 4 : 12, CURVES["expressive.default.spatial"]),
  }));

  // const handleRefresh = useCallback(() => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //   // Reset immediately so the spinner doesn't stay frozen when returning to this screen
  //   setIsRefreshing(false);
  //   router.push("/search");
  // }, [router]);

  const emptyState = () => {
    if (isLoading) {
      return (
        <View className="py-16 items-center justify-center">
          <ActivityIndicator size="small" />
          <P className="text-muted-foreground text-center font-urbanist-regular text-sm mt-1">
            Loading pantry items...
          </P>
        </View>
      );
    }

    if (error) {
      return (
        <View className="py-16 items-center justify-center">
          <P className="text-muted-foreground text-center font-urbanist-regular text-sm">
            {error.message}
          </P>
        </View>
      );
    }

    return (
      <View className="py-16 items-center justify-center">
        <H4 className="text-muted-foreground text-center font-urbanist-semibold">
          Your {selectedItemType === "all" ? "pantry" : selectedItemType} is empty
        </H4>
        <P className="text-muted-foreground text-center font-urbanist-regular text-sm mt-1">
          Buy and add some groceries to your{" "}
          {selectedItemType === "all" ? "pantry" : selectedItemType}
        </P>
      </View>
    );
  };

  return (
    <Animated.FlatList
      contentInsetAdjustmentBehavior="automatic"
      ref={ingredientScrollRef}
      keyExtractor={(item) => item.id.toString()}
      numColumns={3}
      contentContainerStyle={{ paddingBottom: 100 + bottom }}
      showsVerticalScrollIndicator={false}
      data={items}
      style={ingredientListStyle}
      // refreshControl={
      //   <RefreshControl
      //     size="default"
      //     refreshing={isRefreshing}
      //     onRefresh={handleRefresh}
      //     title="Pull to search"
      //   />
      // }
      ListHeaderComponent={
        <View className="bg-background pt-2">
          <IngredientCategoryButtonGroup />
        </View>
      }
      renderItem={({ item, index }) => (
        <IngredientItemCard key={item.id} item={item} index={index} />
      )}
      ListEmptyComponent={emptyState}
      scrollEventThrottle={16}
      itemLayoutAnimation={LinearTransition.springify()
        .damping(20)
        .mass(1)
        .stiffness(300)
        .overshootClamping(0)}
    />
  );
}
