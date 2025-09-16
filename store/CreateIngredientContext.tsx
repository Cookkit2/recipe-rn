import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type {
  ItemType,
  PantryItem,
  PantryItemConfirmation,
} from "~/types/PantryItem";
import { useWindowDimensions } from "react-native";
import { useBaseIngredients } from "~/hooks/supabase-queries/useBaseIngredients";

interface CreateIngredientContextType {
  // UI State only
  photoSize: {
    width: number;
    height: number;
  } | null;
  updatePhotoSize: (photoSize: { width: number; height: number }) => void;
  processPantryItems: PantryItem[];
  addProcessPantryItems: (item: PantryItemConfirmation) => void;
  updateProcessPantryItems: (item: PantryItem) => void;
  deleteProcessPantryItems: (id: string) => void;
  framePosition: { x: number; y: number };
  updateFramePosition: (framePosition: { x: number; y: number }) => void;
}

const CreateIngredientContext =
  createContext<CreateIngredientContextType | null>(null);

export function CreateIngredientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: baseIngredients } = useBaseIngredients();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [photoSize, setPhotoSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [processPantryItems, setProcessPantryItems] = useState<PantryItem[]>(
    []
  );
  const { width, height } = useWindowDimensions();
  const [framePosition, setFramePosition] = useState({
    x: width / 2 - 48, // Center horizontally (minus half frame width: 96px / 2 = 48px)
    y: height / 2 - 48, // Center vertically (minus half frame height: 96px / 2 = 48px)
  });

  const updatePhotoSize = useCallback(
    (photoSize: { width: number; height: number }) => {
      setPhotoSize(photoSize);
    },
    []
  );

  const updateFramePosition = useCallback(
    (framePosition: { x: number; y: number }) => {
      setFramePosition(framePosition);
    },
    []
  );

  const addProcessPantryItems = useCallback(
    (item: PantryItemConfirmation) => {
      const baseIngredient = baseIngredients?.find(
        (ingredient) =>
          ingredient.name.toLowerCase() === item.name.toLowerCase()
      );

      if (baseIngredient) {
        const expiryDate = new Date(
          Date.now() + baseIngredient.days_to_expire * 24 * 60 * 60 * 1000
        );

        const currentNewItem: PantryItem = {
          id: Date.now().toString(), // Temporary ID until saved to DB
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          image_url: item.image_url,
          background_color: item.background_color,
          expiry_date: expiryDate,
          category: "",
          type: baseIngredient.storage_type as Exclude<ItemType, "all">,
          x: 0,
          y: 0,
          scale: 1,
          created_at: new Date(),
          updated_at: new Date(),
          steps_to_store: [],
        };
        setProcessPantryItems((prev) => [currentNewItem, ...prev]);
      } else {
        // By default put 5 days
        const expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        const currentNewItem: PantryItem = {
          id: Date.now().toString(), // Temporary ID until saved to DB
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          image_url: item.image_url,
          background_color: item.background_color,
          expiry_date: expiryDate,
          category: "",
          type: "cabinet",
          x: 0,
          y: 0,
          scale: 1,
          created_at: new Date(),
          updated_at: new Date(),
          steps_to_store: [],
        };
        setProcessPantryItems((prev) => [currentNewItem, ...prev]);
      }
    },
    [baseIngredients]
  );

  const updateProcessPantryItems = useCallback(
    (currentItem: PantryItem) => {
      setProcessPantryItems((prev) =>
        prev.map((item) => (item.id === currentItem.id ? currentItem : item))
      );

      // Clear existing timeout if user triggers another update
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Compare again with the base ingredient to fetch other details
      // set a timeout and debounce for 200ms
      timeoutRef.current = setTimeout(() => {
        const baseIngredient = baseIngredients?.find(
          (ingredient) =>
            ingredient.name.toLowerCase() === currentItem.name.toLowerCase()
        );
        if (baseIngredient) {
          const expiryDate = new Date(
            Date.now() + baseIngredient.days_to_expire * 24 * 60 * 60 * 1000
          );

          // Update the item with new details
          setProcessPantryItems((prev) =>
            prev.map((item) => {
              if (item.id === currentItem.id) {
                return {
                  ...item,
                  expiry_date: expiryDate,
                  type: baseIngredient.storage_type as Exclude<ItemType, "all">,
                };
              }
              return item;
            })
          );
        }
        timeoutRef.current = null;
      }, 200);
    },
    [baseIngredients]
  );

  const deleteProcessPantryItems = useCallback((id: string) => {
    setProcessPantryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <CreateIngredientContext.Provider
      value={{
        photoSize,
        updatePhotoSize,
        processPantryItems,
        addProcessPantryItems,
        updateProcessPantryItems,
        deleteProcessPantryItems,
        framePosition,
        updateFramePosition,
      }}
    >
      {children}
    </CreateIngredientContext.Provider>
  );
}

export const useCreateIngredientStore = () => {
  const context = useContext(CreateIngredientContext);
  if (!context) {
    throw new Error("useCreateIngredientStore must be used within a CreateIngredientProvider");
  }
  return context;
};
