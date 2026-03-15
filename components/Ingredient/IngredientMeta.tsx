import React from "react";
import { Alert, Pressable, View } from "react-native";
import { P } from "~/components/ui/typography";
import { useIngredientDetailStore } from "~/store/IngredientDetailContext";
import { titleCase } from "~/utils/text-formatter";
import { PANTRY_ITEM_TYPE_OPTIONS, PANTRY_ITEM_TYPES } from "~/constants/pantry-item-type";

export default function IngredientMeta() {
  const { pantryItem, updatePantryItem } = useIngredientDetailStore();

  const pantryItemType = PANTRY_ITEM_TYPES.find((option) => option.type === pantryItem.type);

  const buttons = [
    ...PANTRY_ITEM_TYPE_OPTIONS.map((option) => ({
      text: option.label,
      onPress: () => updatePantryItem({ ...pantryItem, type: option.type }),
    })),
    { text: "Cancel", style: "cancel" as const },
  ];

  const showUnitPicker = () => {
    Alert.alert("Select Type", undefined, buttons);
  };

  if (!pantryItemType) {
    return null;
  }

  return (
    <View className="flex-row items-center justify-center mb-12">
      <Pressable className="flex-row items-center gap-1" onPress={showUnitPicker}>
        {React.cloneElement(pantryItemType!.icon, {
          className: "text-foreground/70",
        })}
        <P key="type" className="text-foreground/70 font-urbanist-medium">
          {" " + titleCase(pantryItem.type)}
        </P>
      </Pressable>
      {pantryItem.category && (
        <>
          <P key="separator" className="text-foreground/70 font-urbanist-medium">
            {"  •  "}
          </P>
          <P key="category" className="text-foreground/70 font-urbanist-medium">
            {titleCase(pantryItem.category)}
          </P>
        </>
      )}
    </View>
  );
}
