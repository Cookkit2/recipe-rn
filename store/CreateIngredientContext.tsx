import { AsyncWorkQueue } from "~/utils/async-work-queue";
import React, { createContext, useCallback, useContext, useRef, useState, useEffect } from "react";
import type { ItemType, PantryItem } from "~/types/PantryItem";
import { useWindowDimensions } from "react-native";
import { baseIngredientApi } from "~/data/supabase-api/BaseIngredientApi";

import { File, Paths } from "expo-file-system";
import { titleCase } from "~/utils/text-formatter";
import * as Crypto from "expo-crypto";
import type { Prettify } from "~/utils/type-prettier";
import { log } from "~/utils/logger";
import { CONFIDENCE_REVIEW_THRESHOLD } from "~/constants/recognition";

import { type BaseIngredientWithRelations } from "~/data/supabase-api/BaseIngredientApi";

// Cache for base ingredients to avoid redundant API calls
const baseIngredientCache = new Map<string, BaseIngredientWithRelations | null>();

// Processing status for items being scanned (local to this context).
// `needs_review` is set when the recognition layer returns a low-confidence
// result (below CONFIDENCE_REVIEW_THRESHOLD). It is distinct from a hard
// failure: the item still appears with the AI's best guess so the user can
// correct it inline, rather than silently entering the pantry. See issue #728
// and the SnapChef recognition-bottleneck finding [F4].
export type ProcessingStatus = "processing" | "classifying" | "failed" | "needs_review";

// Extended PantryItem type for the creation flow with processing state
export type CreatePantryItem = Prettify<
  PantryItem & {
    status?: ProcessingStatus;
    imagePath?: string; // Original image path for processing/retry
    framePosition?: { x: number; y: number }; // Focus point for segmentation
    error?: string; // Error message if processing failed
    confidence?: number; // Recognition confidence (0.0-1.0); low values flag needs_review
  }
>;

/**
 * Decide the processing status from a recognition confidence score.
 * Below the threshold the item is flagged for review; at/above it flows
 * through unchanged (status cleared). Exported for unit testing.
 */
export const statusForConfidence = (
  confidence: number | undefined,
  threshold: number = CONFIDENCE_REVIEW_THRESHOLD
): ProcessingStatus | undefined => {
  if (confidence === undefined) return undefined;
  return confidence < threshold ? "needs_review" : undefined;
};

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
  // Apply a user correction to a needs_review item and clear the review flag,
  // following the existing immutability pattern (spread, no mutation).
  confirmCorrectedItem: (id: string, patch: Partial<CreatePantryItem>) => void;
  // Voice-dictation batch entry (#721): merge parsed voice candidates into the
  // processing list. Camera-origin items are preserved; voice items skip the
  // Skia pipeline and arrive with status undefined so confirmation.tsx treats
  // them as eligible for save (same as a finished camera item).
  pushVoiceCandidates: (candidates: CreatePantryItem[]) => void;
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
  const itemsRef = useRef(processPantryItems);
  itemsRef.current = processPantryItems;
  const queueRef = useRef(new AsyncWorkQueue(2));
  const controllers = useRef(new Map<string, AbortController>());
  useEffect(
    () => () => {
      for (const controller of controllers.current.values()) controller.abort();
    },
    []
  );

  const { width, height } = useWindowDimensions();
  const [framePosition, setFramePosition] = useState({
    x: width / 2 - 48, // Center horizontally (minus half frame width: 96px / 2 = 48px)
    y: height / 2 - 48, // Center vertically (minus half frame height: 96px / 2 = 48px)
  });

  const updateFramePosition = useCallback((framePosition: { x: number; y: number }) => {
    setFramePosition(framePosition);
  }, []);

  // Process a single item (runs independently, updates state when done)
  const processItem = useCallback(
    async (
      itemId: string,
      imagePath: string,
      itemFramePosition: { x: number; y: number },
      signal: AbortSignal
    ) => {
      const pipelineStart = performance.now();

      try {
        // Lazy-load skia-dependent modules (734KB deferred until camera use)
        const [
          { loadImageIntoSkia },
          { segmentStaticImage, trimTransparentBordersAndResizeImage },
          { classifyStaticImage },
        ] = await Promise.all([
          import("~/hooks/model/processImage"),
          import("~/hooks/model/segmentModel"),
          import("~/hooks/model/classifyModel"),
        ]);

        signal.throwIfAborted();
        const skImage = await loadImageIntoSkia(imagePath);
        signal.throwIfAborted();

        if (!skImage) {
          throw new Error("Failed to load image");
        }

        const normalizedFramePosition = {
          x: (itemFramePosition.x / width) * skImage.width(),
          y: (itemFramePosition.y / ((width * 4) / 3)) * skImage.height(),
        };

        // Recognition uses the original photo, so it can overlap native segmentation.
        const recognition = classifyStaticImage(skImage, signal).then(
          (value) => ({ value, error: undefined }),
          (error: unknown) => ({ value: undefined, error })
        );
        const segmentedImage = await segmentStaticImage(skImage, normalizedFramePosition, signal);
        signal.throwIfAborted();

        if (!segmentedImage) {
          throw new Error("Segmentation failed");
        }

        // Step 2: Save processed image to file
        const filename = `masked-${Date.now()}-${itemId}.png`;
        const file = new File(Paths.cache, filename);

        const resizedImage = trimTransparentBordersAndResizeImage(segmentedImage.skImage, 300, 2);
        const { base64 } = resizedImage;

        file.write(base64, { encoding: "base64" });

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
        const recognized = await recognition;
        signal.throwIfAborted();
        if (recognized.error) throw recognized.error;
        const content = recognized.value;

        if (!content) {
          throw new Error("Classification failed");
        }

        // By default put 5 days expiry
        const expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

        // Low-confidence recognitions are flagged for review rather than
        // silently committed. High-confidence items flow through unchanged
        // (status cleared) — no extra taps for the common case.
        const nextStatus = statusForConfidence(content.confidence);

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
                  confidence: content.confidence,
                  status: nextStatus,
                  imagePath: undefined,
                  framePosition: undefined,
                }
              : i
          )
        );

        // Step 6: Fetch base ingredient data in the background
        try {
          signal.throwIfAborted();
          const formattedName = titleCase(content.name);
          let baseIngredient = baseIngredientCache.get(formattedName);

          if (baseIngredient === undefined) {
            baseIngredient = await baseIngredientApi.getBaseIngredientByName(formattedName);
            signal.throwIfAborted();
            baseIngredientCache.set(formattedName, baseIngredient);
          }

          signal.throwIfAborted();
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
          if (signal.aborted) return;
          log.error("Error fetching base ingredient after processing:", error);
          // Continue with default values if fetch fails
        }
      } catch (error) {
        if (signal.aborted) return;
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

  const startProcessing = useCallback(
    (id: string, path: string, point: { x: number; y: number }) => {
      controllers.current.get(id)?.abort();
      const controller = new AbortController();
      controllers.current.set(id, controller);
      void queueRef.current
        .run(() => processItem(id, path, point, controller.signal), controller.signal)
        .finally(() => {
          if (controllers.current.get(id) === controller) controllers.current.delete(id);
        })
        .catch((error) => log.warn("Photo processing failed", error));
    },
    [processItem]
  );

  // Add item and immediately start processing (fire and forget, parallel)
  const processImage = useCallback(
    (imagePath: string, itemFramePosition: { x: number; y: number }) => {
      const itemId = `item-${Date.now()}-${Crypto.randomUUID()}`;

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
      startProcessing(itemId, imagePath, itemFramePosition);
    },
    [startProcessing]
  );

  // Remove item from list
  const removeItem = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setProcessPantryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Retry a failed item
  const retryItem = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((candidate) => candidate.id === id);
      if (!item?.imagePath || !item.framePosition) return;
      setProcessPantryItems((previous) =>
        previous.map((candidate) =>
          candidate.id === id ? { ...candidate, status: "processing", error: undefined } : candidate
        )
      );
      startProcessing(id, item.imagePath, item.framePosition);
    },
    [startProcessing]
  );

  // Clear all failed items
  const clearFailedItems = useCallback(() => {
    setProcessPantryItems((prev) => prev.filter((item) => item.status !== "failed"));
  }, []);

  // Apply a user correction to a needs_review item and clear the review flag.
  // The corrected item remains in processPantryItems and is now eligible for
  // save (status undefined). Follows the existing immutability pattern.
  const confirmCorrectedItem = useCallback((id: string, patch: Partial<CreatePantryItem>) => {
    setProcessPantryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch, status: undefined } : item))
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
        let baseIngredient = baseIngredientCache.get(currentItem.name);

        if (baseIngredient === undefined) {
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
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setProcessPantryItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Merge voice-dictated candidates into the processing list. Existing
  // camera-origin items are preserved untouched. Duplicates (same normalized
  // name) merge by summing quantities when units match; otherwise the new
  // candidate is appended so the user can resolve it in the confirmation sheet.
  const pushVoiceCandidates = useCallback((candidates: CreatePantryItem[]) => {
    if (candidates.length === 0) return;

    setProcessPantryItems((prev) => {
      const next = [...prev];

      for (const candidate of candidates) {
        const key = candidate.name.toLowerCase();
        const existingIdx = next.findIndex(
          (item) => item.name.toLowerCase() === key && item.unit === candidate.unit
        );

        if (existingIdx >= 0) {
          const existing = next[existingIdx];
          if (existing) {
            next[existingIdx] = {
              ...existing,
              quantity: existing.quantity + candidate.quantity,
            };
          }
        } else {
          next.push(candidate);
        }
      }

      return next;
    });
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
        confirmCorrectedItem,
        pushVoiceCandidates,
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
