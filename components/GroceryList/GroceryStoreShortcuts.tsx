import { useRef, useState } from "react";
import { View } from "react-native";
import { ShoppingBagIcon, StoreIcon } from "lucide-uniwind";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import {
  openIngredientStore,
  shopForIngredients,
  type IngredientShoppingProvider,
} from "~/lib/ingredient-shopping";
import type { GrabMartShoppingItem } from "~/utils/grabmart-shopping";

const STORES = [
  { id: "grabmart", label: "GrabMart", Icon: ShoppingBagIcon },
  { id: "foodpanda", label: "foodpanda", Icon: StoreIcon },
] as const;

export default function GroceryStoreShortcuts({
  items,
}: {
  items: readonly GrabMartShoppingItem[];
}) {
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
    <View className="flex-row gap-3 px-5 mb-4">
      {STORES.map(({ id, label, Icon }) => (
        <Button
          key={id}
          variant="outline"
          containerClassName="flex-1"
          className="h-auto min-h-12 flex-row gap-2 rounded-full px-3 py-3"
          disabled={openingStore !== null}
          isLoading={openingStore === id}
          onPress={() => void openStore(id, label)}
          accessibilityLabel={`Shop on ${label}`}
          accessibilityHint="Opens the store and copies any remaining grocery items"
        >
          {openingStore !== id && <Icon size={20} className="text-foreground" />}
          <P className="shrink font-urbanist-semibold text-sm">{label}</P>
        </Button>
      ))}
    </View>
  );
}
