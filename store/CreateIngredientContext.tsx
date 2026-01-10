import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  startTransition,
} from "react";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import { useWindowDimensions } from "react-native";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";
import { classifyStaticImage } from "~/hooks/model/classifyModel";
import { loadImageIntoSkia } from "~/hooks/model/processImage";
import {
  segmentStaticImage,
  trimTransparentBorders,
  resizeImagePreserveAlpha,
} from "~/hooks/model/segmentModel";
import { CAMERA_RESOLUTION } from "~/app/ingredient/(create)/create";
import { File, Paths } from "expo-file-system";
import { titleCase } from "~/utils/text-formatter";
import * as Haptics from "expo-haptics";
import type { Prettify } from "~/utils/type-prettier";

// Processing status for items being scanned (local to this context)
export type ProcessingStatus = "processing" | "classifying" | "failed";

// Extended PantryItem type for the creation flow with processing state
export type CreatePantryItem = Prettify<
  PantryItem & {
    status?: ProcessingStatus;
    imagePath?: string; // Original image path for processing/retry
    framePosition?: { x: number; y: number }; // Focus point for segmentation
    error?: string; // Error message if processing failed
  }
>;

interface CreateIngredientContextType {
  processPantryItems: CreatePantryItem[];
  updateProcessPantryItems: (item: CreatePantryItem) => void;
  deleteProcessPantryItems: (id: string) => void;
  framePosition: { x: number; y: number };
  updateFramePosition: (framePosition: { x: number; y: number }) => void;
  // Process image immediately (fire and forget, runs in parallel)
  processImage: (
    imagePath: string,
    framePosition: { x: number; y: number }
  ) => void;
  removeItem: (id: string) => void;
  retryItem: (id: string) => void;
  clearFailedItems: () => void;
}

const CreateIngredientContext =
  createContext<CreateIngredientContextType | null>(null);

export function CreateIngredientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [processPantryItems, setProcessPantryItems] = useState<
    CreatePantryItem[]
  >([]);

  const { width, height } = useWindowDimensions();
  const [framePosition, setFramePosition] = useState({
    x: width / 2 - 48, // Center horizontally (minus half frame width: 96px / 2 = 48px)
    y: height / 2 - 48, // Center vertically (minus half frame height: 96px / 2 = 48px)
  });

  const updateFramePosition = useCallback(
    (framePosition: { x: number; y: number }) => {
      setFramePosition(framePosition);
    },
    []
  );

  // Process a single item (runs independently, updates state when done)
  const processItem = useCallback(
    async (
      itemId: string,
      imagePath: string,
      itemFramePosition: { x: number; y: number }
    ) => {
      try {
        const normalizedFramePosition = {
          x: (itemFramePosition.x / width) * CAMERA_RESOLUTION.width,
          y:
            (itemFramePosition.y / ((width * 4) / 3)) *
            CAMERA_RESOLUTION.height,
        };

        const skImage = await loadImageIntoSkia(imagePath);

        if (!skImage) {
          throw new Error("Failed to load image");
        }

        // Step 1: Segment the image first
        const segmentedImage = await segmentStaticImage(
          skImage,
          normalizedFramePosition
        );

        if (!segmentedImage) {
          throw new Error("Segmentation failed");
        }

        // Step 2: Save processed image to file
        const filename = `masked-${Date.now()}-${itemId}.png`;
        const file = new File(Paths.cache, filename);

        const { finalImage: trimmedImage } = trimTransparentBorders(
          segmentedImage.skImage,
          2
        );
        const { base64 } = resizeImagePreserveAlpha(trimmedImage, 300);

        file.write(base64, { encoding: "base64" });

        // Step 3: Update the item with the segmented image first
        startTransition(() => {
          setProcessPantryItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    image_url: file.uri,
                    background_color: segmentedImage.background_color,
                    status: "classifying", // Segmentation done, now classifying
                  }
                : i
            )
          );
        });

        // Step 4: Classify the image
        const content = await classifyStaticImage(skImage);

        if (!content) {
          throw new Error("Classification failed");
        }

        // By default put 5 days expiry
        const expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        // Step 5: Update with classification results
        startTransition(() => {
          setProcessPantryItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    name: titleCase(content.name),
                    quantity: content.quantity,
                    unit: content.unit,
                    expiry_date: expiryDate,
                    status: undefined,
                    imagePath: undefined,
                    framePosition: undefined,
                  }
                : i
            )
          );
        });

        // Step 6: Fetch base ingredient data in the background
        try {
          const baseIngredient =
            await baseIngredientApi.getBaseIngredientByName(
              titleCase(content.name)
            );

          if (baseIngredient) {
            const newExpiryDate = new Date(
              Date.now() + baseIngredient.days_to_expire * 24 * 60 * 60 * 1000
            );

            startTransition(() => {
              setProcessPantryItems((prev) =>
                prev.map((i) => {
                  if (i.id === itemId) {
                    return {
                      ...i,
                      name: baseIngredient.name,
                      expiry_date: newExpiryDate,
                      type: baseIngredient.storage_type as Exclude<
                        ItemType,
                        "all"
                      >,
                      base_ingredient_id: baseIngredient.id,
                      base_ingredient_name: baseIngredient.name,
                      synonyms: baseIngredient.synonyms,
                      categories: baseIngredient.categories,
                    };
                  }
                  return i;
                })
              );
            });
          }
        } catch {
          // Continue with default values if fetch fails
        }

        // Haptic feedback for success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Processing error:", error);

        // Mark as failed
        startTransition(() => {
          setProcessPantryItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    status: "failed" as const,
                    error:
                      error instanceof Error
                        ? error.message
                        : "Processing failed",
                  }
                : i
            )
          );
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    []
  );

  // Add item and immediately start processing (fire and forget, parallel)
  const processImage = useCallback(
    (imagePath: string, itemFramePosition: { x: number; y: number }) => {
      const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newItem: CreatePantryItem = {
        id: itemId,
        name: "Processing...",
        quantity: 1,
        unit: "unit",
        image_url: undefined,
        background_color: undefined,
        category: "",
        type: "cabinet",
        x: 0,
        y: 0,
        scale: 1,
        created_at: new Date(),
        updated_at: new Date(),
        steps_to_store: [],
        status: "processing",
        imagePath,
        framePosition: itemFramePosition,
      };

      // Add to list immediately
      setProcessPantryItems((prev) => [newItem, ...prev]);

      // Start processing in parallel (fire and forget)
      processItem(itemId, imagePath, itemFramePosition);
    },
    [processItem]
  );

  // Remove item from list
  const removeItem = useCallback((id: string) => {
    setProcessPantryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Retry a failed item
  const retryItem = useCallback(
    (id: string) => {
      setProcessPantryItems((prev) => {
        const item = prev.find((i) => i.id === id);
        if (item?.imagePath && item?.framePosition) {
          // Restart processing
          processItem(id, item.imagePath, item.framePosition);
          return prev.map((i) =>
            i.id === id
              ? { ...i, status: "processing" as const, error: undefined }
              : i
          );
        }
        return prev;
      });
    },
    [processItem]
  );

  // Clear all failed items
  const clearFailedItems = useCallback(() => {
    setProcessPantryItems((prev) =>
      prev.filter((item) => item.status !== "failed")
    );
  }, []);

  const updateProcessPantryItems = useCallback((currentItem: PantryItem) => {
    setProcessPantryItems((prev) =>
      prev.map((item) => (item.id === currentItem.id ? currentItem : item))
    );

    // Clear existing timeout if user triggers another update
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Fetch base ingredient data after debounce
    timeoutRef.current = setTimeout(async () => {
      try {
        const baseIngredient = await baseIngredientApi.getBaseIngredientByName(
          currentItem.name
        );

        if (baseIngredient) {
          const expiryDate = new Date(
            Date.now() + baseIngredient.days_to_expire * 24 * 60 * 60 * 1000
          );

          // Update the item with new details
          startTransition(() => {
            setProcessPantryItems((prev) =>
              prev.map((item) => {
                if (item.id === currentItem.id) {
                  return {
                    ...item,
                    name: baseIngredient.name, // Use the standardized name
                    expiry_date: expiryDate,
                    type: baseIngredient.storage_type as Exclude<
                      ItemType,
                      "all"
                    >,
                    base_ingredient_id: baseIngredient.id,
                    base_ingredient_name: baseIngredient.name,
                    synonyms: baseIngredient.synonyms,
                    categories: baseIngredient.categories,
                  };
                }
                return item;
              })
            );
          });
        }
      } catch (error) {
        console.error("Error fetching base ingredient on update:", error);
      }

      timeoutRef.current = null;
    }, 200);
  }, []);

  const deleteProcessPantryItems = useCallback((id: string) => {
    setProcessPantryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <CreateIngredientContext.Provider
      value={{
        processPantryItems,
        updateProcessPantryItems,
        deleteProcessPantryItems,
        framePosition,
        updateFramePosition,
        processImage,
        removeItem,
        retryItem,
        clearFailedItems,
      }}
    >
      {children}
    </CreateIngredientContext.Provider>
  );
}

export const useCreateIngredientStore = () => {
  const context = useContext(CreateIngredientContext);
  if (!context) {
    throw new Error(
      "useCreateIngredientStore must be used within a CreateIngredientProvider"
    );
  }
  return context;
};
