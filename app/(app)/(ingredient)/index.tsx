import { FlatList, View } from "react-native";
import { H1, H4 } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { IngredientItemCard } from "~/components/Pantry/IngredientItemCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeToggle } from "~/components/ThemeToggle";
import IngredientCategoryButtonGroup from "~/components/Pantry/IngredientCategoryButtonGroup";
import MenuDropdown from "~/components/Pantry/MenuDropdown";
import AddPantryItemModal from "~/components/Pantry/AddPantryItemModal";
import { usePantryStore } from "~/store/PantryContext";
import RecipeButton from "~/components/Pantry/RecipeButton";

export default function Screen() {
  const { bottom: pb, top: pt } = useSafeAreaInsets();
  const pantryItems = dummyPantryItems;

  const { selectedItemType } = usePantryStore();

  const filteredItems = pantryItems.filter((item) => {
    if (selectedItemType === "all") return true;
    return item.type === selectedItemType;
  });

  return (
    <View className="relative flex-1" style={{ paddingTop: pt }}>
      <View className="p-6 pb-4 flex-row items-center mb-4 gap-3">
        <H1>Pantry</H1>
        <View className="flex-1" />
        <AddPantryItemModal />
        <MenuDropdown />
        <ThemeToggle />
      </View>
      <IngredientCategoryButtonGroup />
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
          ListEmptyComponent={
            <View className="py-16 items-center justify-center">
              <H4 className="text-muted-foreground text-center">No items</H4>
            </View>
          }
        />
      </View>
      <RecipeButton />
    </View>
  );
}
