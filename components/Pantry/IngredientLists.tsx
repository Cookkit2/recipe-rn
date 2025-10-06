import React from "react";
import { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePantryStore } from "~/store/PantryContext";
import { IngredientItemCard } from "./IngredientItemCard";
import { View, ActivityIndicator, FlatList } from "react-native";
import { H4, P } from "~/components/ui/typography";
import { CURVES } from "~/constants/curves";
import { usePantryItemsByType } from "~/hooks/queries/usePantryQueries";

export default function IngredientLists() {
  const { bottom } = useSafeAreaInsets();
  const { selectedItemType, ingredientScrollY, isRecipeOpen } =
    usePantryStore();
  const {
    data: filteredPantryItems,
    isLoading,
    error,
  } = usePantryItemsByType(selectedItemType);

  const flatListStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: withTiming(
        isRecipeOpen ? 4 : 12,
        CURVES["expressive.default.spatial"]
      ),
    };
  }, [isRecipeOpen]);

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
    <FlatList
      keyExtractor={(item) => item.id.toString()}
      numColumns={2}
      className="pb-3"
      style={[flatListStyle]}
      contentContainerStyle={{ paddingBottom: 64 + bottom }}
      showsVerticalScrollIndicator={false}
      data={filteredPantryItems}
      renderItem={({ item, index }) => (
        <IngredientItemCard key={item.id} item={item} index={index} />
      )}
      onScroll={(e) => {
        ingredientScrollY.value = e.nativeEvent.contentOffset.y;
      }}
      ListEmptyComponent={
        <View className="py-16 items-center justify-center">
          <H4 className="text-muted-foreground text-center font-urbanist-semibold">
            Your {selectedItemType === "all" ? "pantry" : selectedItemType} is
            empty
          </H4>
          <P className="text-muted-foreground text-center font-urbanist-regular text-sm mt-1">
            Buy and add some groceries to your{" "}
            {selectedItemType === "all" ? "pantry" : selectedItemType}
          </P>
        </View>
      }
    />
  );
}
