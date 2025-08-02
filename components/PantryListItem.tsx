import { Image, View } from "react-native";
import { Text } from "~/components/ui/text";
import type { PantryItem } from "~/types/PantryItem";
import { MotiView } from "moti";
export const PantryListItem = ({ item }: { item: PantryItem }) => {
  console.log("Rendering PantryListItem", item.image_url);
  return (
    <View className="flex-row items-center gap-4 p-2">
      <Image
        source={item.image_url}
        className="size-1 w-12 h-12 rounded-full"
      />
      <MotiView
        className="flex-1"
        from={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ type: "spring", damping: 10, delay: 1000 }}
      >
        <Text className="font-semibold">{item.name}</Text>
        <Text className="text-muted-foreground">{item.quantity}</Text>
      </MotiView>
    </View>
  );
};
