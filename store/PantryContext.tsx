import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { FlatList } from "react-native";
import {
  useAnimatedRef,
  useScrollOffset,
  useSharedValue,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CURVES } from "~/constants/curves";
import { EXPANDED_HEIGHT } from "~/constants/pantry";
import type { ItemType } from "~/types/PantryItem";

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

  ingredientScrollRef: AnimatedRef<FlatList>;
  ingredientScrollY: SharedValue<number>;
}

const PantryContext = createContext<PantryContextType | null>(null);

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const { bottom } = useSafeAreaInsets();

  // UI State
  const [selectedItemType, setSelectedItemType] = useState<ItemType>("all");
  const [isRecipeOpen, setIsRecipeOpen] = useState<boolean>(false);

  // Animation values
  const translateY = useSharedValue(0);
  const context = useSharedValue<{ y: number }>({ y: 0 });
  const isGestureActive = useSharedValue(false);

  const ingredientScrollRef = useAnimatedRef<FlatList>();
  const ingredientScrollY = useScrollOffset(ingredientScrollRef);

  // Height when collapsed
  const collapsedHeight = useMemo(() => bottom + 8 + 44, [bottom]);

  // UI callbacks
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
        ingredientScrollRef,
        ingredientScrollY,
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
