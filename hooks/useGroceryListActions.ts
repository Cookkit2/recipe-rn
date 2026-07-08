import { useState } from "react";
import { Alert } from "react-native";
import { toast } from "sonner-native";
import {
  useClearGroceryChecks,
  useClearMealPlan,
  useDeleteGroceryItem,
} from "~/hooks/queries/useMealPlanQueries";

export function useGroceryListActions() {
  const clearChecks = useClearGroceryChecks();
  const clearMealPlan = useClearMealPlan();
  const deleteItem = useDeleteGroceryItem();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemNames, setSelectedItemNames] = useState<Set<string>>(new Set());

  const handleClearChecked = () => {
    clearChecks.mutate(undefined, {
      onSuccess: () => {
        toast.success("Cleared all checked items");
      },
    });
  };

  const handleClearAll = () => {
    Alert.alert("Clear All", "Are you sure you want to clear your entire meal plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearMealPlan.mutate(undefined, {
            onSuccess: () => {
              toast.success("Cleared all planned recipes");
            },
          });
        },
      },
    ]);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItemNames(new Set());
  };

  const toggleItemSelection = (name: string) => {
    const next = new Set(selectedItemNames);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedItemNames(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedItemNames.size === 0) {
      return;
    }

    Alert.alert(
      "Delete Selected",
      `Are you sure you want to delete ${selectedItemNames.size} items?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Delete items
            for (const name of selectedItemNames) {
              deleteItem.mutate(name);
            }

            setIsSelectionMode(false);
            setSelectedItemNames(new Set());
            toast.success("Deleted selected items");
          },
        },
      ]
    );
  };

  return {
    isSelectionMode,
    selectedItemNames,
    handleClearChecked,
    handleClearAll,
    toggleSelectionMode,
    toggleItemSelection,
    handleDeleteSelected,
  };
}
