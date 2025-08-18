import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CURVES } from "~/constants/curves";
import { EXPANDED_HEIGHT } from "~/constants/pantry";
import { dummyPantryItems } from "~/data/dummy-data";
import type { ItemType, PantryItem } from "~/types/PantryItem";

interface PantryContextType {
  selectedItemType: ItemType;
  changeItemType: (type: ItemType) => void;

  isRecipeOpen: boolean;
  updateRecipeOpen: (value: boolean) => void;

  // ====== Animations related variables ======
  // The actual Y translate from top of the screen to the bottom
  translateY: SharedValue<number>;
  // The context for the gesture to calculate translateY
  context: SharedValue<{ y: number }>;
  isGestureActive: SharedValue<boolean>;
  collapsedHeight: number;

  // Use to manually snap the bottom recipe page to expanded state
  snapToExpanded: () => void;

  ingredientScrollY: SharedValue<number>;

  filteredPantryItems: PantryItem[];
}

const PantryContext = createContext<PantryContextType | null>(null);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const { bottom } = useSafeAreaInsets();

  const [selectedItemType, setSelectedItemType] = useState<ItemType>("all");
  const [isRecipeOpen, setIsRecipeOpen] = useState<boolean>(false);
  const [pantryItems, setPantryItems] =
    useState<PantryItem[]>(dummyPantryItems);

  // For pan gesture
  const translateY = useSharedValue(0);
  const context = useSharedValue<{ y: number }>({ y: 0 });
  const isGestureActive = useSharedValue(false);

  // For ingredient scrolling bottom border
  const ingredientScrollY = useSharedValue(0);

  // Height when collapsed
  const collapsedHeight = useMemo(() => bottom + 8 + 44, [bottom]);

  const changeItemType = useCallback((type: ItemType) => {
    setSelectedItemType(type);
  }, []);

  const updateRecipeOpen = useCallback((value: boolean) => {
    setIsRecipeOpen(value);
  }, []);

  const snapToExpanded = useCallback(() => {
    "worklet";
    translateY.value = withTiming(
      -EXPANDED_HEIGHT + collapsedHeight,
      CURVES["expressive.default.spatial"]
    );
  }, [translateY, collapsedHeight]);

  const filteredPantryItems = useMemo(() => {
    return pantryItems.filter((item) => {
      if (selectedItemType === "all") return true;
      return item.type === selectedItemType;
    });
  }, [pantryItems, selectedItemType]);

  return (
    <PantryContext.Provider
      value={{
        selectedItemType,
        changeItemType,
        isRecipeOpen,
        updateRecipeOpen,
        translateY,
        context,
        isGestureActive,
        collapsedHeight,
        snapToExpanded,
        ingredientScrollY,
        filteredPantryItems,
      }}
    >
      {children}
    </PantryContext.Provider>
  );
}

export const usePantryStore = () => {
  const context = useContext(PantryContext);
  if (!context) {
    throw new Error("usePantryStore must be used within a PantryProvider");
  }
  return context;
};
