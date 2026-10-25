import { useRef, useState } from "react";
import { Stack } from "expo-router";
import useColors from "~/hooks/useColor";
import { toast } from "sonner-native";
import {
  openIngredientStore,
  shopForIngredients,
  type IngredientShoppingProvider,
} from "~/lib/ingredient-shopping";
import type { GrabMartShoppingItem } from "~/utils/grabmart-shopping";

interface GroceryListHeaderRightProps {
  items: readonly GrabMartShoppingItem[];
  isSelectionMode: boolean;
  canSelectItems: boolean;
  onToggleSelection: () => void;
  onDeleteSelected: () => void;
}

export default function GroceryListHeaderRight({
  items,
  isSelectionMode,
  canSelectItems,
  onToggleSelection,
  onDeleteSelected,
}: GroceryListHeaderRightProps) {
  const colors = useColors();
  const opening = useRef(false);
  const [openingStore, setOpeningStore] = useState<IngredientShoppingProvider | null>(null);

  const openStore = async (provider: IngredientShoppingProvider, label: string) => {
    if (opening.current) return;
    opening.current = true;
    setOpeningStore(provider);
    try {
      const result = await shopForIngredients(provider, items);
      switch (result) {
        case "empty":
          if (!(await openIngredientStore(provider))) {
            toast.error(`Couldn't open ${label}. Please try again.`);
          }
          break;
        case "opened":
          toast.success("List copied");
          break;
        case "copied":
          toast.error(`List copied. Open ${label} to shop.`);
          break;
      }
    } catch {
      toast.error("Couldn't copy your list. Please try again.");
    } finally {
      opening.current = false;
      setOpeningStore(null);
    }
  };

  return (
    <Stack.Toolbar placement="right">
      {isSelectionMode ? (
        <>
          <Stack.Toolbar.Button
            icon="xmark"
            tintColor={colors.foreground}
            onPress={onToggleSelection}
            accessibilityLabel="Cancel selection"
          />
          <Stack.Toolbar.Button
            icon="trash"
            tintColor={colors.destructive}
            onPress={onDeleteSelected}
            accessibilityLabel="Delete selected items"
          />
        </>
      ) : (
        <Stack.Toolbar.Menu
          icon="ellipsis"
          tintColor={colors.foreground}
          accessibilityLabel="Grocery list options"
        >
          <Stack.Toolbar.Label>Options</Stack.Toolbar.Label>
          <Stack.Toolbar.MenuAction
            icon="bag"
            disabled={openingStore !== null}
            onPress={() => void openStore("grabmart", "GrabMart")}
          >
            Shop on GrabMart
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="storefront"
            disabled={openingStore !== null}
            onPress={() => void openStore("foodpanda", "foodpanda")}
          >
            Shop on foodpanda
          </Stack.Toolbar.MenuAction>
          {canSelectItems && (
            <Stack.Toolbar.MenuAction icon="pencil" onPress={onToggleSelection}>
              Select items
            </Stack.Toolbar.MenuAction>
          )}
        </Stack.Toolbar.Menu>
      )}
    </Stack.Toolbar>
  );
}
