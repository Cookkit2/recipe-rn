import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePantryStore } from "~/store/PantryContext";
import IngredientItemCard from "./IngredientItemCard";
import { View, ActivityIndicator } from "react-native";
import { H4, P } from "~/components/ui/typography";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";
import Animated, { LinearTransition, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { CURVES } from "~/constants/curves";
import IngredientCategoryButtonGroup from "./IngredientCategoryButtonGroup";

export default function IngredientLists() {
  const { bottom } = useSafeAreaInsets();
  const { selectedItemType, ingredientScrollRef, isRecipeOpen } = usePantryStore();
  const { data, isLoading, error } = usePantryItemsByType(selectedItemType);
  const items = data ?? [];
  const ingredientListStyle = useAnimatedStyle(() => ({
    paddingHorizontal: withTiming(isRecipeOpen ? 4 : 12, CURVES["expressive.default.spatial"]),
  }));

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
      numColumns={2}
      contentContainerStyle={{ paddingBottom: 100 + bottom }}
      showsVerticalScrollIndicator={false}
      data={items}
      style={ingredientListStyle}
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
