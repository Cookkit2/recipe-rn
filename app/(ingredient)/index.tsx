import { FlatList, View } from "react-native";
import { H1, H4 } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { IngredientItemCard } from "~/components/Ingredient/IngredientItemCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeToggle } from "~/components/ThemeToggle";
import ToggleButtonGroup from "~/components/Pantry/ToggleButtonGroup";
import MenuDropdown from "~/components/Pantry/MenuDropdown";
import AddPantryItemModal from "~/components/Pantry/AddPantryItemModal";
import useItemTypeStore from "~/store/type-store";
import RecipeButton from "~/components/Pantry/RecipeButton";
import { Redirect } from "expo-router";

export default function Screen() {
  const { bottom: pb, top: pt } = useSafeAreaInsets();
  const pantryItems = dummyPantryItems;

  const { selectedItemType } = useItemTypeStore();

  const filteredItems = pantryItems.filter((item) => {
    if (selectedItemType === "all") return true;
    return item.type === selectedItemType;
});

  // return <Redirect href="/onboarding" />;

  return (
    <View className="relative flex-1 bg-background" style={{ paddingTop: pt }}>
      <View className="p-6 pb-4 flex-row items-center mb-4 gap-3">
        <H1>Pantry</H1>
        <View className="flex-1" />
        <AddPantryItemModal />
        <MenuDropdown />
        <ThemeToggle />
      </View>
      <ToggleButtonGroup />
      <View className="p-3">
        <FlatList
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 64 + pb }}
          showsVerticalScrollIndicator={false}
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => (
            <IngredientItemCard key={item.id} item={item} index={index} />
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
