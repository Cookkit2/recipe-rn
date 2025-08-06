import { FlatList, View } from "react-native";
import { H1, H4 } from "~/components/ui/typography";
import { dummyPantryItems } from "~/data/dummy-data";
import { IngredientItemCard } from "~/components/IngredientItemCard";
import ToggleButtonGroup from "~/components/ToggleButtonGroup";
import MenuDropdown from "~/components/MenuDropdown";
import AddPantryItemModal from "~/components/AddPantryItemModal";
import useItemTypeStore from "~/store/type-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { Link } from "expo-router";

export default function Screen() {
  const { bottom: pb, top: pt } = useSafeAreaInsets();
  const pantryItems = dummyPantryItems;

  const { selectedItemType } = useItemTypeStore();

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
      </View>
      <ToggleButtonGroup />
      {/* <Link href="/recipes" push asChild>
        <Button
          size="lg"
          variant="default"
          className="absolute mx-auto rounded-full"
          style={{ bottom: 16 + pb }}
        >
          <H4 className="text-primary-foreground text-center">Let's Cook</H4>
        </Button>
      </Link> */}
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
    </View>
  );
}
