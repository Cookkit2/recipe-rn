import React from "react";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePantryStore } from "~/store/PantryContext";
import { IngredientItemCard } from "./IngredientItemCard";
import { View } from "react-native";
import { H4 } from "../ui/typography";
import { CURVES } from "~/constants/curves";

export default function IngredientLists() {
  const { bottom } = useSafeAreaInsets();
  const { filteredPantryItems, ingredientScrollY, isRecipeOpen } =
    usePantryStore();

  const flatListStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: withTiming(
        isRecipeOpen ? 4 : 12,
        CURVES["expressive.default.spatial"]
      ),
    };
  });

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
        </View>
      }
    />
  );
}
