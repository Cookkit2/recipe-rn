import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useUpdatePantryItem } from "~/hooks/queries/usePantryQueries";
import type { PantryItem } from "~/types/PantryItem";

interface IngredientDetailContextType {
  pantryItem: PantryItem;
  updatePantryItem: (pantryItem: PantryItem) => void;
}

const IngredientDetailContext =
  createContext<IngredientDetailContextType | null>(null);

export function IngredientDetailProvider({
  children,
  item,
}: {
  children: React.ReactNode;
  item: PantryItem;
}) {
  const [pantryItem, setPantryItem] = useState<PantryItem>(item);
  const updatePantryItemMutation = useUpdatePantryItem();

  // Ref to keep track of the latest pantry item state
  const pantryItemRef = useRef<PantryItem>(item);

  const updatePantryItem = useCallback((newPantryItem: PantryItem) => {
    setPantryItem(newPantryItem);
    pantryItemRef.current = newPantryItem;
  }, []);

  // Save changes when component unmounts
  useEffect(() => {
    return () => {
      console.log("Saving pantry item changes...", pantryItemRef.current);
      // Only save if there were changes to avoid unnecessary API calls
      updatePantryItemMutation.mutate({
        id: pantryItemRef.current.id,
        updates: pantryItemRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IngredientDetailContext.Provider
      value={{
        pantryItem,
        updatePantryItem,
      }}
    >
      {children}
    </IngredientDetailContext.Provider>
  );
}

export const useIngredientDetailStore = () => {
  const context = useContext(IngredientDetailContext);
  if (!context) {
    throw new Error(
      "useIngredientDetailStore must be used within a IngredientDetailProvider"
    );
  }
  return context;
};
