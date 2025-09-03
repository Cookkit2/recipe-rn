import React from "react";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePantryStore } from "~/store/PantryContext";
import { IngredientItemCard } from "./IngredientItemCard";
import { View, ActivityIndicator } from "react-native";
import { H4, P } from "../ui/typography";
import { CURVES } from "~/constants/curves";

export default function IngredientLists() {
  const { bottom } = useSafeAreaInsets();
  const {
    filteredPantryItems,
    ingredientScrollY,
    isRecipeOpen,
    isLoading,
    error,
  } = usePantryStore();

  const flatListStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: withTiming(
        isRecipeOpen ? 4 : 12,
        CURVES["expressive.default.spatial"]
      ),
    };
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <ActivityIndicator size="small" />
        <P className="mt-2 text-muted-foreground">Loading pantry items...</P>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <P className="text-destructive text-center">{error}</P>
      </View>
    );
  }

  return (
    <Animated.FlatList
      numColumns={2}
      className="pb-3 pt-0"
      style={[flatListStyle]}
      contentContainerStyle={{ paddingBottom: 64 + bottom }}
      showsVerticalScrollIndicator={false}
      data={filteredPantryItems}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <IngredientItemCard key={item.id} item={item} />
      )}
      onScroll={(e) =>
        (ingredientScrollY.value = e.nativeEvent.contentOffset.y)
      }
      ListEmptyComponent={
        <View className="py-16 items-center justify-center">
          <H4 className="text-muted-foreground text-center">No items</H4>
          <P className="text-muted-foreground text-center text-sm mt-1">
            Add ingredients to your pantry to get started.
          </P>
        </View>
      }
    />
  );
}
