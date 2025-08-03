import { FlatList, View } from "react-native";
import { H1 } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { PantryListItem } from "~/components/IngredientItem";
import ToggleButtonGroup from "~/components/ToggleButtonGroup";
import MenuDropdown from "~/components/MenuDropdown";
import AddPantryItemModal from "~/components/AddPantryItemModal";
import useItemTypeStore from "~/store/type-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Screen() {
  const { bottom: pb } = useSafeAreaInsets();
  const pantryItems = dummyPantryItems;

  const { selectedItemType } = useItemTypeStore();

  const filteredItems = pantryItems.filter((item) => {
    if (selectedItemType === "all") return true;
    return item.type === selectedItemType;
  });

  return (
    <View className="flex-1 p-safe">
      <View className="p-6 pb-4 flex-row items-center mb-4 gap-3">
        <H1>Pantry</H1>
        <View className="flex-1" />
        <AddPantryItemModal />
        <MenuDropdown />
      </View>
      <ToggleButtonGroup />
      <View className="p-3">
        <FlatList
          numColumns={2}
          contentContainerStyle={{ paddingBottom: 64 + pb }}
          showsVerticalScrollIndicator={false}
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={PantryListItem}
        />
      </View>
    </View>
  );
}
