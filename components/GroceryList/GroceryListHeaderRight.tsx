import { useRef, useState } from "react";
import { Stack } from "expo-router";
import useColors from "~/hooks/useColor";
import { toast } from "sonner-native";
import {
  openIngredientStore,
  shopForIngredients,
  type IngredientShoppingProvider,
} from "~/lib/ingredient-shopping";
import { formatGrabMartShoppingList, type GrabMartShoppingItem } from "~/utils/grabmart-shopping";
import useLocalStorageState from "~/hooks/useLocalStorageState";
import { GRABMART_SHOPPING_GUIDE_COMPLETED_KEY } from "~/constants/storage-keys";
import GrabMartShoppingGuide from "./GrabMartShoppingGuide";

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
  const [guideComplete, setGuideComplete, { isLoading: guideLoading }] = useLocalStorageState(
    GRABMART_SHOPPING_GUIDE_COMPLETED_KEY,
    { defaultValue: false }
  );
  const [guideOpen, setGuideOpen] = useState(false);
  const list = formatGrabMartShoppingList(items);

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
          setGuideOpen(false);
          break;
        case "opened":
          if (provider === "grabmart") {
            if (!guideComplete) setGuideComplete(true);
            setGuideOpen(false);
          }
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

  const requestGrabMart = () => {
    if (opening.current || guideLoading || guideOpen) return;
    if (!guideComplete && list) setGuideOpen(true);
    else void openStore("grabmart", "GrabMart");
  };

  return (
    <>
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
              disabled={openingStore !== null || guideLoading || guideOpen}
              onPress={requestGrabMart}
            >
              Shop on GrabMart
            </Stack.Toolbar.MenuAction>
            {canSelectItems && (
              <Stack.Toolbar.MenuAction icon="pencil" onPress={onToggleSelection}>
                Select items
              </Stack.Toolbar.MenuAction>
            )}
          </Stack.Toolbar.Menu>
        )}
      </Stack.Toolbar>
      {guideOpen && (
        <GrabMartShoppingGuide
          list={list}
          busy={openingStore !== null}
          onContinue={() => void openStore("grabmart", "GrabMart")}
          onClose={() => {
            if (!opening.current) setGuideOpen(false);
          }}
        />
      )}
    </>
  );
}
