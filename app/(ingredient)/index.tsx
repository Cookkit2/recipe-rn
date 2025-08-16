import { FlatList, View } from "react-native";
import { H1, H4 } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { IngredientItemCard } from "~/components/Ingredient/IngredientItemCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToggleButtonGroup from "~/components/Pantry/ToggleButtonGroup";
import MenuDropdown from "~/components/Pantry/MenuDropdown";
import AddPantryItemModal from "~/components/Pantry/AddPantryItemModal";
import useItemTypeStore from "~/store/type-store";
import RecipeButton from "~/components/Pantry/RecipeButton";
import { useSharedValue } from "react-native-reanimated";

export default function IngredientScreen() {
  const { bottom: pb, top: pt } = useSafeAreaInsets();
  const { selectedItemType } = useItemTypeStore();

  const localScrollY = useSharedValue(0);
  const pantryItems = dummyPantryItems;

  const filteredItems = pantryItems.filter((item) => {
    if (selectedItemType === "all") return true;
    return item.type === selectedItemType;
  });

  return (
    <View className="relative flex-1 bg-background" style={{ paddingTop: pt }}>
      <View className="px-6 flex-row items-center my-4 gap-3">
        <H1 className="font-bowlby-one leading-[1.6]">Pantry</H1>
        <View className="flex-1" />
        <AddPantryItemModal />
        <MenuDropdown />
      </View>
      <ToggleButtonGroup scrollY={localScrollY} />
      <FlatList
        numColumns={2}
        className="p-3 pt-0"
        contentContainerStyle={{ paddingBottom: 64 + pb }}
        showsVerticalScrollIndicator={false}
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <IngredientItemCard key={item.id} item={item} />
        )}
        onScroll={(e) => (localScrollY.value = e.nativeEvent.contentOffset.y)}
        ListEmptyComponent={
          <View className="py-16 items-center justify-center">
            <H4 className="text-muted-foreground text-center">No items</H4>
          </View>
        }
      />
      <RecipeButton />
    </View>
  );
}
