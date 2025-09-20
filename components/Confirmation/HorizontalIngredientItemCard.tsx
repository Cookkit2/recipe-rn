import React from "react";
import { Pressable, View } from "react-native";
import useColors from "~/hooks/useColor";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import { type PantryItem } from "~/types/PantryItem";
import IngredientQuantity from "../Ingredient/IngredientQuantity";
import EditableTitle from "../Shared/EditableTitle";
import OutlinedImage from "../ui/outlined-image";
import { Button } from "../ui/button";
import { Trash2Icon } from "lucide-nativewind";
import { useRouter } from "expo-router";

export default function HorizontalIngredientItemCard({
  item,
}: {
  item: PantryItem;
}) {
  const router = useRouter();
  const { image_url, name, quantity, unit } = item;
  const { updateProcessPantryItems, deleteProcessPantryItems } =
    useCreateIngredientStore();

  const colors = useColors();

  const updateTitle = (text: string) => {
    if (!item) return;
    //clone another object of same id
    const newItem = { ...item, name: text };
    updateProcessPantryItems(newItem);
  };

  return (
    <View className="flex-1 flex-row items-start gap-4 p-3">
      <View
        className="w-36 relative rounded-3xl flex items-center justify-center border-continuous aspect-square"
        style={[{ backgroundColor: item.background_color || colors.muted }]}
      >
        <OutlinedImage source={image_url} size={64} />
      </View>
      <View className="mt-2 flex-1 flex-column">
        <EditableTitle
          value={name}
          onChangeText={updateTitle}
          placeholder="Enter title"
          TextComponent="H3"
          textClassName="opacity-80 font-urbanist-bold"
        />
        <View className="flex-1" />
        <View className="flex-row justify-between">
          <IngredientQuantity
            size="sm"
            quantity={quantity}
            unit={unit}
            className="justify-start gap-1"
            updateQuantity={(quantity) =>
              updateProcessPantryItems({ ...item, quantity })
            }
            updateUnit={(unit) => updateProcessPantryItems({ ...item, unit })}
          />
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            onPress={() => deleteProcessPantryItems(item.id)}
          >
            <Trash2Icon
              className="text-destructive"
              size={20}
              strokeWidth={2.618}
            />
          </Button>
        </View>
      </View>
    </View>
  );
}
