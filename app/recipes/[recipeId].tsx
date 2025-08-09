import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1 } from "~/components/ui/typography";

export default function RecipeDetails() {
  const { bottom: pb, top: pt } = useSafeAreaInsets();

  return (
    <View className="relative flex-1" style={{ paddingTop: pt }}>
      <View className="p-6 pb-4 flex-row items-center mb-4 gap-3">
        <H1>Pantry</H1>
        <View className="flex-1" />
        {/* <AddPantryItemModal />
      <MenuDropdown />
      <ThemeToggle /> */}
      </View>
      {/* <ToggleButtonGroup />
    <View className="p-3">
      <FlatList
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 64 + pb }}
        showsVerticalScrollIndicator={false}
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IngredientItemCard key={item.id} item={item} />
        )}
      />
    </View>
    <RecipeButton /> */}
    </View>
  );
}
