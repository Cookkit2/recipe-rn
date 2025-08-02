import { useEffect } from "react";
import { View, FlatList } from "react-native";
import { Button } from "~/components/ui/button";
import { H1, P } from "~/components/ui/typography";
import { PlusIcon } from "lucide-react-native";
import { usePantryStore } from "~/store/pantry-store";
import { PantryListItem } from "~/components/PantryListItem";
import { dummyPantryItems } from "~/data/dummy-data";

export default function Screen() {
  const pantryItems = dummyPantryItems;
  // const { pantryItems } = usePantryStore();

  return (
    <View className="flex-1 p-safe">
      <View className="p-6 flex-row items-center justify-between mb-4">
        <H1>Pantry</H1>
        <Button
          size="icon"
          variant="secondary"
          className="size-8 rounded-full"
          onPress={() => {}}
        >
          <PlusIcon />
        </Button>
      </View>
      <FlatList
        data={pantryItems}
        renderItem={({ item }) => <PantryListItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
}
