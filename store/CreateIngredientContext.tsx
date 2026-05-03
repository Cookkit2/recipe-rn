import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import { useWindowDimensions } from "react-native";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";
import { classifyStaticImage } from "~/hooks/model/classifyModel";
import { loadImageIntoSkia } from "~/hooks/model/processImage";
import {
  segmentStaticImage,
  trimTransparentBordersAndResizeImage,
} from "~/hooks/model/segmentModel";
import { CAMERA_RESOLUTION } from "~/constants/camera";
import { File, Paths } from "expo-file-system";
import { titleCase } from "~/utils/text-formatter";
import * as Crypto from "expo-crypto";
import type { Prettify } from "~/utils/type-prettier";
import { log } from "~/utils/logger";

import { type BaseIngredientWithRelations } from "~/data/supabase-api/BaseIngredientApi";

// Cache for base ingredients to avoid redundant API calls
const baseIngredientCache = new Map<string, BaseIngredientWithRelations | null>();

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
  processImage: (imagePath: string, framePosition: { x: number; y: number }) => void;
  removeItem: (id: string) => void;
  retryItem: (id: string) => void;
  clearFailedItems: () => void;
}

const CreateIngredientContext = createContext<CreateIngredientContextType | null>(null);

function getImageFileDebugInfo(imagePath: string) {
  try {
    const file = new File(imagePath);
    return {
      normalizedUri: file.uri,
      exists: file.exists,
      size: file.size,
      type: file.type || "unknown",
      extension: file.extension || "unknown",
      hasFileUriScheme: imagePath.startsWith("file://"),
    };
  } catch (error) {
    return {
      normalizedUri: imagePath,
      exists: false,
      size: 0,
      type: "unknown",
      extension: "unknown",
      hasFileUriScheme: imagePath.startsWith("file://"),
      fileInfoError: error instanceof Error ? error.message : String(error),
    };
  }
}

export function CreateIngredientProvider({ children }: { children: React.ReactNode }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [processPantryItems, setProcessPantryItems] = useState<CreatePantryItem[]>([]);

  const { width, height } = useWindowDimensions();
  const [framePosition, setFramePosition] = useState({
    x: width / 2 - 48, // Center horizontally (minus half frame width: 96px / 2 = 48px)
    y: height / 2 - 48, // Center vertically (minus half frame height: 96px / 2 = 48px)
  });

  const updateFramePosition = useCallback((framePosition: { x: number; y: number }) => {
    log.info("[create-camera] frame position updated", {
      x: framePosition.x,
      y: framePosition.y,
      screenWidth: width,
      screenHeight: height,
    });

    setFramePosition(framePosition);
  }, [height, width]);

  // Process a single item (runs independently, updates state when done)
  const processItem = useCallback(
    async (itemId: string, imagePath: string, itemFramePosition: { x: number; y: number }) => {
      const pipelineStart = performance.now();
      log.info("[create-camera] process item started", {
        itemId,
        imagePath,
        frameX: itemFramePosition.x,
        frameY: itemFramePosition.y,
        screenWidth: width,
        screenHeight: height,
        ...getImageFileDebugInfo(imagePath),
      });

      try {
        const skiaStart = performance.now();
        const skImage = await loadImageIntoSkia(imagePath);
        const skiaDuration = performance.now() - skiaStart;

        log.info("[create-camera] Skia image load returned", {
          itemId,
          loaded: !!skImage,
          width: skImage?.width() ?? 0,
          height: skImage?.height() ?? 0,
          durationMs: Number(skiaDuration.toFixed(2)),
        });

        if (!skImage) {
          throw new Error("Failed to load image");
        }

        const normalizedFramePosition = {
          x: (itemFramePosition.x / width) * skImage.width(),
          y: (itemFramePosition.y / ((width * 4) / 3)) * skImage.height(),
        };

        log.info("[create-camera] frame position normalized", {
          itemId,
          inputX: itemFramePosition.x,
          inputY: itemFramePosition.y,
          normalizedX: Number(normalizedFramePosition.x.toFixed(2)),
          normalizedY: Number(normalizedFramePosition.y.toFixed(2)),
          imageWidth: skImage.width(),
          imageHeight: skImage.height(),
          targetCameraWidth: CAMERA_RESOLUTION.width,
          targetCameraHeight: CAMERA_RESOLUTION.height,
        });

        // Step 1: Segment the image first
        const segmentStart = performance.now();
        log.info("[create-camera] segmentation starting", { itemId });
        const segmentedImage = await segmentStaticImage(skImage, normalizedFramePosition);
        const segmentDuration = performance.now() - segmentStart;

        log.info("[create-camera] segmentation completed", {
          itemId,
          hasSegmentedImage: !!segmentedImage,
          backgroundColor: segmentedImage?.background_color ?? "none",
          segmentedWidth: segmentedImage?.skImage.width() ?? 0,
          segmentedHeight: segmentedImage?.skImage.height() ?? 0,
          durationMs: Number(segmentDuration.toFixed(2)),
        });

        if (!segmentedImage) {
          throw new Error("Segmentation failed");
        }

        // Step 2: Save processed image to file
        const filename = `masked-${Date.now()}-${itemId}.png`;
        const file = new File(Paths.cache, filename);

        const saveStart = performance.now();
        log.info("[create-camera] trimming and resizing segmented image", { itemId, filename });
        const resizedImage = trimTransparentBordersAndResizeImage(segmentedImage.skImage, 300, 2);
        const { base64 } = resizedImage;

        file.write(base64, { encoding: "base64" });

        log.info("[create-camera] processed image written", {
          itemId,
          uri: file.uri,
          exists: file.exists,
          size: file.size,
          base64Length: base64.length,
          outputWidth: resizedImage.width,
          outputHeight: resizedImage.height,
          durationMs: Number((performance.now() - saveStart).toFixed(2)),
        });

        // Step 3: Update the item with the segmented image first
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

        // Step 4: Classify the image
        const classifyStart = performance.now();
        log.info("[create-camera] classification starting", { itemId });
        const content = await classifyStaticImage(skImage);
        const classifyDuration = performance.now() - classifyStart;

        log.info("[create-camera] classification completed", {
          itemId,
          hasContent: !!content,
          name: content?.name ?? "none",
          quantity: content?.quantity ?? 0,
          unit: content?.unit ?? "none",
          durationMs: Number(classifyDuration.toFixed(2)),
        });

        if (!content) {
          throw new Error("Classification failed");
        }

        // By default put 5 days expiry
        const expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        // Step 5: Update with classification results
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

        // Step 6: Fetch base ingredient data in the background
        try {
          const formattedName = titleCase(content.name);
          let baseIngredient = baseIngredientCache.get(formattedName);

          if (baseIngredient === undefined) {
            log.info("[create-camera] base ingredient fetch starting", {
              itemId,
              formattedName,
            });
            baseIngredient = await baseIngredientApi.getBaseIngredientByName(formattedName);
            baseIngredientCache.set(formattedName, baseIngredient);
          } else {
            log.info("[create-camera] base ingredient cache hit", {
              itemId,
              formattedName,
              found: !!baseIngredient,
            });
          }

          log.info("[create-camera] base ingredient fetch completed", {
            itemId,
            formattedName,
            found: !!baseIngredient,
            baseIngredientId: baseIngredient?.id ?? "none",
          });

          if (baseIngredient) {
            const newExpiryDate = new Date(
              Date.now() + baseIngredient.days_to_expire * 24 * 60 * 60 * 1000
            );

            setProcessPantryItems((prev) =>
              prev.map((i) => {
                if (i.id === itemId) {
                  return {
                    ...i,
                    name: baseIngredient.name,
                    expiry_date: newExpiryDate,
                    type: baseIngredient.storage_type as Exclude<ItemType, "all">,
                    base_ingredient_id: baseIngredient.id,
                    base_ingredient_name: baseIngredient.name,
                    synonyms: baseIngredient.synonyms,
                    categories: baseIngredient.categories,
                  };
                }
                return i;
              })
            );
          }
        } catch (error) {
          log.error("Error fetching base ingredient after processing:", error);
          // Continue with default values if fetch fails
        }

        log.info("[create-camera] process item completed", {
          itemId,
          durationMs: Number((performance.now() - pipelineStart).toFixed(2)),
        });
      } catch (error) {
        log.error("[create-camera] processing error", {
          itemId,
          imagePath,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Number((performance.now() - pipelineStart).toFixed(2)),
          ...getImageFileDebugInfo(imagePath),
        });

        // Mark as failed
        setProcessPantryItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status: "failed" as const,
                  error: error instanceof Error ? error.message : "Processing failed",
                }
              : i
          )
        );
      }
    },
    [height, width]
  );

  // Add item and immediately start processing (fire and forget, parallel)
  const processImage = useCallback(
    (imagePath: string, itemFramePosition: { x: number; y: number }) => {
      const itemId = `item-${Date.now()}-${Crypto.randomUUID()}`;
      log.info("[create-camera] process image queued", {
        itemId,
        imagePath,
        frameX: itemFramePosition.x,
        frameY: itemFramePosition.y,
        currentItemCount: processPantryItems.length,
        ...getImageFileDebugInfo(imagePath),
      });

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
    [processItem, processPantryItems.length]
  );

  // Remove item from list
  const removeItem = useCallback((id: string) => {
    log.info("[create-camera] removing process item", { id });
    setProcessPantryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Retry a failed item
  const retryItem = useCallback(
    (id: string) => {
      log.info("[create-camera] retry requested", { id });
      setProcessPantryItems((prev) => {
        const item = prev.find((i) => i.id === id);
        if (item?.imagePath && item?.framePosition) {
          log.info("[create-camera] retry starting", {
            id,
            imagePath: item.imagePath,
            frameX: item.framePosition.x,
            frameY: item.framePosition.y,
            ...getImageFileDebugInfo(item.imagePath),
          });

          // Restart processing
          processItem(id, item.imagePath, item.framePosition);
          return prev.map((i) =>
            i.id === id ? { ...i, status: "processing" as const, error: undefined } : i
          );
        }
        log.warn("[create-camera] retry skipped because source image data is missing", { id });
        return prev;
      });
    },
    [processItem]
  );

  // Clear all failed items
  const clearFailedItems = useCallback(() => {
    log.info("[create-camera] clearing failed process items");
    setProcessPantryItems((prev) => prev.filter((item) => item.status !== "failed"));
  }, []);

  const updateProcessPantryItems = useCallback((currentItem: PantryItem) => {
    log.info("[create-camera] process item manually updated", {
      id: currentItem.id,
      name: currentItem.name,
      quantity: currentItem.quantity,
      unit: currentItem.unit,
    });

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
        let baseIngredient = baseIngredientCache.get(currentItem.name);

        if (baseIngredient === undefined) {
          log.info("[create-camera] base ingredient fetch after manual update starting", {
            id: currentItem.id,
            name: currentItem.name,
          });
          baseIngredient = await baseIngredientApi.getBaseIngredientByName(currentItem.name);
          baseIngredientCache.set(currentItem.name, baseIngredient);
        }

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
                  name: baseIngredient.name, // Use the standardized name
                  expiry_date: expiryDate,
                  type: baseIngredient.storage_type as Exclude<ItemType, "all">,
                  base_ingredient_id: baseIngredient.id,
                  base_ingredient_name: baseIngredient.name,
                  synonyms: baseIngredient.synonyms,
                  categories: baseIngredient.categories,
                };
              }
              return item;
            })
          );
        }
      } catch (error) {
        log.error("[create-camera] error fetching base ingredient on update", error);
      }

      timeoutRef.current = null;
    }, 200);
  }, []);

  const deleteProcessPantryItems = useCallback((id: string) => {
    log.info("[create-camera] deleting process item", { id });
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
    throw new Error("useCreateIngredientStore must be used within a CreateIngredientProvider");
  }
  return context;
};
