import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CURVES } from "~/constants/curves";
import { EXPANDED_HEIGHT } from "~/constants/pantry";
import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { Stock, BaseIngredient } from "~/data/db/models";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import { getPlaceholderImage } from "~/constants/images";

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

  // ====== Database related variables ======
  filteredPantryItems: PantryItem[];
  isLoading: boolean;
  error: string | null;

  // Database operations
  refreshPantryItems: () => Promise<void>;
  addPantryItem: (
    item: Omit<PantryItem, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
  updatePantryItem: (id: string, updates: Partial<PantryItem>) => Promise<void>;
  deletePantryItem: (id: string) => Promise<void>;
}

const PantryContext = createContext<PantryContextType | null>(null);

// Helper function to convert Stock + BaseIngredient to PantryItem
const convertStockToPantryItem = async (stock: Stock): Promise<PantryItem> => {
  const baseIngredient = await stock.baseIngredient;

  // Map database category to ItemType
  const mapCategoryToType = (category?: string): Exclude<ItemType, "all"> => {
    if (!category) return "fridge";
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("cabinet") || lowerCategory.includes("pantry"))
      return "cabinet";
    if (lowerCategory.includes("freezer")) return "freezer";
    return "fridge"; // default
  };

  return {
    id: stock.id,
    name: stock.name,
    quantity: stock.quantity,
    unit: stock.unit,
    expiry_date: stock.expiryDate || undefined,
    category: stock.category || "Other",
    type: mapCategoryToType(stock.category),
    image_url:
      stock.imageUrl || getPlaceholderImage(stock.name, stock.category),
    x: stock.x || 0,
    y: stock.y || 0,
    scale: stock.scale || 1,
    created_at: stock.createdAt,
    updated_at: stock.updatedAt,
    steps_to_store: [], // TODO: Load from StepsToStore model
  };
};

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const { bottom } = useSafeAreaInsets();

  // UI State
  const [selectedItemType, setSelectedItemType] = useState<ItemType>("all");
  const [isRecipeOpen, setIsRecipeOpen] = useState<boolean>(false);

  // Database State
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const translateY = useSharedValue(0);
  const context = useSharedValue<{ y: number }>({ y: 0 });
  const isGestureActive = useSharedValue(false);
  const ingredientScrollY = useSharedValue(0);

  // Height when collapsed
  const collapsedHeight = useMemo(() => bottom + 8 + 44, [bottom]);

  // Load pantry items from database
  const refreshPantryItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("🔍 Debug: databaseFacade:", databaseFacade);
      console.log("🔍 Debug: databaseFacade type:", typeof databaseFacade);
      console.log("🔍 Debug: databaseFacade.stock:", databaseFacade?.stock);

      if (!databaseFacade) {
        throw new Error("DatabaseFacade is undefined - import failed");
      }

      if (!databaseFacade.stock) {
        throw new Error(
          `databaseFacade.stock is undefined. DatabaseFacade: ${!!databaseFacade}`
        );
      }

      // Run health check
      const isHealthy = await databaseFacade.isHealthy();
      if (!isHealthy) {
        throw new Error("Database health check failed");
      }

      const stockItems = await databaseFacade.stock.findAll();
      console.log("🔍 Debug: Found", stockItems.length, "stock items");

      const pantryItemsConverted = await Promise.all(
        stockItems.map(convertStockToPantryItem)
      );

      setPantryItems(pantryItemsConverted);
    } catch (err) {
      console.error("❌ Error loading pantry items:", err);
      setError(
        `Failed to load pantry items: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    refreshPantryItems();
  }, [refreshPantryItems]);

  // Database operations
  const addPantryItem = useCallback(
    async (item: Omit<PantryItem, "id" | "created_at" | "updated_at">) => {
      try {
        setError(null);

        // First create or find base ingredient
        let baseIngredient = await databaseFacade.ingredients.findByName(
          item.name
        );
        if (!baseIngredient) {
          baseIngredient = await databaseFacade.ingredients.create({
            name: item.name,
            synonyms: [],
          });
        }

        // Create stock item
        await databaseFacade.stock.create({
          baseIngredientId: baseIngredient.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiryDate: item.expiry_date,
          category: item.category,
          imageUrl:
            typeof item.image_url === "string" ? item.image_url : undefined,
          x: item.x,
          y: item.y,
          scale: item.scale,
        });

        await refreshPantryItems();
      } catch (err) {
        console.error("Error adding pantry item:", err);
        setError("Failed to add pantry item");
      }
    },
    [refreshPantryItems]
  );

  const updatePantryItem = useCallback(
    async (id: string, updates: Partial<PantryItem>) => {
      try {
        setError(null);

        const stock = await databaseFacade.stock.findById(id);
        if (!stock) {
          throw new Error("Stock item not found");
        }

        await stock.updateStock({
          name: updates.name,
          quantity: updates.quantity,
          unit: updates.unit,
          expiryDate: updates.expiry_date,
          category: updates.category,
          imageUrl:
            typeof updates.image_url === "string"
              ? updates.image_url
              : undefined,
          x: updates.x,
          y: updates.y,
          scale: updates.scale,
        });

        await refreshPantryItems();
      } catch (err) {
        console.error("Error updating pantry item:", err);
        setError("Failed to update pantry item");
      }
    },
    [refreshPantryItems]
  );

  const deletePantryItem = useCallback(
    async (id: string) => {
      try {
        setError(null);

        await databaseFacade.stock.delete(id);
        await refreshPantryItems();
      } catch (err) {
        console.error("Error deleting pantry item:", err);
        setError("Failed to delete pantry item");
      }
    },
    [refreshPantryItems]
  );

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

  // Filtered pantry items
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
        isLoading,
        error,
        refreshPantryItems,
        addPantryItem,
        updatePantryItem,
        deletePantryItem,
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
