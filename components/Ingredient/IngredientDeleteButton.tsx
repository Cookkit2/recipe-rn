import { Trash2Icon } from "lucide-uniwind";
import React from "react";
import { Alert, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useDeletePantryItem } from "~/hooks/queries/usePantryQueries";

const IngredientDeleteButton = () => {
  const { ingredientId } = useGlobalSearchParams<{ ingredientId: string }>();
  const deletePantryItem = useDeletePantryItem();

  const router = useRouter();
  const onDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Alert.alert("Delete", `Are you sure you want to delete this ingredient?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePantryItem.mutate(ingredientId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  return (
    <Pressable onPress={onDelete} accessibilityLabel="Delete ingredient" accessibilityRole="button">
      <Trash2Icon className="text-destructive" size={20} strokeWidth={2.618} />
    </Pressable>
  );
};

export default IngredientDeleteButton;
