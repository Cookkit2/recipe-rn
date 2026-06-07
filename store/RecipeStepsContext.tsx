import React, { createContext, useContext, useCallback, useState, useRef } from "react";
import { useRouter } from "expo-router";
import { useAnimatedReaction, useSharedValue, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { ICarouselInstance } from "react-native-reanimated-carousel";
import type { TextLoopRef } from "~/components/ui/TextLoop";
import type { Recipe, RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import type { StepPageData } from "~/app/recipes/[recipeId]/steps";
import { storage, database } from "~/data";
import { RECIPE_COOKED_KEY, INGREDIENTS_USED_BEFORE_EXPIRY_KEY } from "~/constants/storage-keys";
import { achievementService } from "~/data/services/AchievementService";
import {
  usePantryItemsByType,
  useUpdatePantryItem,
  useDeletePantryItem,
} from "~/hooks/queries/usePantryQueries";
import { isIngredientMatch } from "~/utils/ingredient-matching";
import {
  areDimensionsCompatible,
  convertToBaseUnit,
  roundToReasonablePrecision,
} from "~/utils/unit-converter";
import { queryClient } from "./QueryProvider";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";
import { cookingHistoryQueryKeys } from "~/hooks/queries/useCookingHistoryQueries";
import { log } from "~/utils/logger";

interface RecipeStepsContextType {
  currentStep: number;
  setCurrentStep: (value: number) => void;
  goToNextStep: (servings: number) => void;
  goToPreviousStep: () => void;
  carouselRef: React.RefObject<ICarouselInstance | null>;
  stepPages: StepPageData[];
  progress: SharedValue<number>;
  recipe: Recipe;
  duration: number | null;
  loopRef: React.RefObject<TextLoopRef | null>;
  showRatingModal: boolean;
  closeRatingModal: () => void;
  saveRatingAndComplete: (rating: number | undefined, notes: string) => void;
  skipRatingAndComplete: () => void;
  isCompletingRecipe: boolean;
}

const RecipeStepsContext = createContext<RecipeStepsContextType | null>(null);

/**
 * Record consumption of expiring stock items for the given recipe ingredients.
 * Accepts WatermelonDB model instances or plain RecipeIngredient objects.
 */
async function recordIngredientConsumption(
  baseRecipeId: string,
  ingredients: Array<{ name: string; quantity: number }>
): Promise<void> {
  const now = Date.now();

  for (const ingredient of ingredients) {
    const matchingStocks = await database.getStockByIngredient(ingredient.name);

    if (matchingStocks.length > 0) {
      const exactMatch = matchingStocks[0];
      if (exactMatch && exactMatch.quantity > 0) {
        const stockModel = await database.getStockById(exactMatch.id);
        if (stockModel && stockModel.expiryDate) {
          if (now <= stockModel.expiryDate.getTime()) {
            await database.recordConsumption(
              stockModel.id,
              Math.min(ingredient.quantity, exactMatch.quantity),
              {
                recipeId: baseRecipeId,
                consumedDate: now,
                isBeforeExpiry: true,
              }
            );
          }
        }
      }
    }
  }
}

/**
 * Record the cooking event and ingredient consumption in the database, then check achievements.
 */
async function recordCookingAndConsumption(
  baseRecipeId: string,
  servings: number,
  rating?: number,
  notes?: string
): Promise<void> {
  try {
    await database.recordCooking(baseRecipeId, {
      rating,
      notes: notes || `Cooked ${servings} serving${servings !== 1 ? "s" : ""}`,
      servingsMade: servings,
    });

    try {
      const recipe = await database.getRecipeById(baseRecipeId);
      if (recipe) {
        const ingredients = await recipe.ingredients.fetch();
        await recordIngredientConsumption(baseRecipeId, ingredients);
      }
    } catch (error) {
      log.error("Failed to record ingredient consumption:", error);
    }

    await achievementService.checkAchievements();
  } catch {
    // Continue even if recording fails
  }
}

/**
 * Find pantry items that match recipe ingredients.
 */
function findMatchingPantryItems(
  recipeIngredients: RecipeIngredient[],
  pantryItems: PantryItem[]
): Array<{ pantryItem: PantryItem; recipeIngredient: RecipeIngredient }> {
  const matches: Array<{
    pantryItem: PantryItem;
    recipeIngredient: RecipeIngredient;
  }> = [];

  recipeIngredients.forEach((recipeIngredient) => {
    const matchingPantryItem = pantryItems.find((pantryItem) =>
      isIngredientMatch(
        pantryItem.name,
        recipeIngredient.name,
        pantryItem.synonyms?.map((s) => s.synonym)
      )
    );
    if (matchingPantryItem) {
      matches.push({ pantryItem: matchingPantryItem, recipeIngredient });
    }
  });

  return matches;
}

/**
 * Calculate how much to reduce from a pantry item based on the recipe ingredient quantity.
 */
function calculatePantryReduction(
  pantryItem: PantryItem,
  recipeIngredient: RecipeIngredient,
  servings: number
): number {
  let reductionInPantryUnits: number;

  if (areDimensionsCompatible(pantryItem.unit, recipeIngredient.unit)) {
    const recipeInBase = convertToBaseUnit(recipeIngredient.quantity, recipeIngredient.unit);
    const pantryInBase = convertToBaseUnit(pantryItem.quantity, pantryItem.unit);

    if (pantryInBase > 0) {
      reductionInPantryUnits = (recipeInBase / pantryInBase) * pantryItem.quantity;
    } else {
      reductionInPantryUnits = 0;
    }
  } else {
    const normalizedPantryUnit = pantryItem.unit.toLowerCase().trim();
    const normalizedRecipeUnit = recipeIngredient.unit.toLowerCase().trim();

    if (normalizedPantryUnit === normalizedRecipeUnit) {
      reductionInPantryUnits = recipeIngredient.quantity;
    } else {
      reductionInPantryUnits = 1;
    }
  }

  return reductionInPantryUnits * servings;
}

/**
 * Check if a pantry item was used before its expiry date.
 */
function isUsedBeforeExpiry(pantryItem: PantryItem): boolean {
  if (!pantryItem.expiry_date) return false;
  const expiryDate = new Date(pantryItem.expiry_date);
  const now = new Date();
  expiryDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return expiryDate >= now;
}

/**
 * Deduct matched ingredients from pantry, update achievement metrics, and return count of
 * ingredients used before expiry.
 */
async function deductPantryIngredients(
  matches: Array<{ pantryItem: PantryItem; recipeIngredient: RecipeIngredient }>,
  servings: number,
  updateMutation: ReturnType<typeof useUpdatePantryItem>,
  deleteMutation: ReturnType<typeof useDeletePantryItem>
): Promise<number> {
  let ingredientsUsedBeforeExpiryCount = 0;

  const updatePromises = matches.map(async ({ pantryItem, recipeIngredient }) => {
    if (isUsedBeforeExpiry(pantryItem)) {
      ingredientsUsedBeforeExpiryCount++;
    }

    const totalReductionAmount = calculatePantryReduction(pantryItem, recipeIngredient, servings);
    const newQuantity = roundToReasonablePrecision(
      Math.max(0, pantryItem.quantity - totalReductionAmount)
    );

    if (newQuantity <= 0) {
      return deleteMutation.mutateAsync(pantryItem.id);
    } else {
      return updateMutation.mutateAsync({
        id: pantryItem.id,
        updates: { quantity: newQuantity },
      });
    }
  });

  await Promise.all(updatePromises);
  return ingredientsUsedBeforeExpiryCount;
}

/**
 * Invalidate cooking-related queries so UI refreshes.
 */
function invalidateCookingQueries(baseRecipeId: string): void {
  queryClient.invalidateQueries({
    queryKey: recipeQueryKeys.recommendations(),
  });
  queryClient.invalidateQueries({
    queryKey: cookingHistoryQueryKeys.all,
  });
  queryClient.invalidateQueries({
    queryKey: cookingHistoryQueryKeys.recipeCookCount(baseRecipeId),
  });
}

export function RecipeStepsProvider({
  recipe,
  baseRecipeId,
  stepPages,
  children,
}: {
  recipe: Recipe;
  baseRecipeId: string;
  stepPages: StepPageData[];
  children: React.ReactNode;
}) {
  const loopRef = useRef<TextLoopRef | null>(null);

  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const carouselRef = useRef<ICarouselInstance | null>(null);
  const progress = useSharedValue<number>(0);

  // Get pantry items and mutations for ingredient removal
  const { data: pantryItems = [] } = usePantryItemsByType("all");
  const updatePantryItemMutation = useUpdatePantryItem();
  const deletePantryItemMutation = useDeletePantryItem();

  // Timer state
  const startTime = useRef(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const duration = endTime ? endTime - startTime.current : null;

  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isCompletingRecipe, setIsCompletingRecipe] = useState(false);
  const pendingServings = useRef<number>(0);

  const animateLoopToIndex = useCallback((index: number) => {
    loopRef.current?.animateToIndex(index);
  }, []);

  const updateEndTime = useCallback(() => {
    setEndTime(Date.now());
    storage.set(RECIPE_COOKED_KEY, true);
  }, []);

  const handleRecipeCompletion = useCallback(
    async (servings: number, rating?: number, notes?: string) => {
      // Record the cooking in the database
      await recordCookingAndConsumption(baseRecipeId, servings, rating, notes);

      // Find matching pantry items
      const matches = findMatchingPantryItems(recipe.ingredients, pantryItems);

      // If no matches found, just navigate away
      if (matches.length === 0) {
        router.dismissTo("/");
        return;
      }

      // Automatically deduct ingredients without showing alerts
      try {
        const ingredientsUsedBeforeExpiryCount = await deductPantryIngredients(
          matches,
          servings,
          updatePantryItemMutation,
          deletePantryItemMutation
        );

        // Update the achievements tracker if any unexpired ingredients were used
        if (ingredientsUsedBeforeExpiryCount > 0) {
          const currentCount = Number(storage.get(INGREDIENTS_USED_BEFORE_EXPIRY_KEY)) || 0;
          storage.set(
            INGREDIENTS_USED_BEFORE_EXPIRY_KEY,
            (currentCount + ingredientsUsedBeforeExpiryCount).toString()
          );

          await achievementService.checkAchievements();
        }
      } catch {
        // Silent error handling - errors are handled gracefully
      }

      invalidateCookingQueries(baseRecipeId);

      // Navigate away after processing
      router.dismissTo("/");
    },
    [
      baseRecipeId,
      recipe.ingredients,
      pantryItems,
      router,
      updatePantryItemMutation,
      deletePantryItemMutation,
    ]
  );

  const saveRatingAndComplete = useCallback(
    async (rating: number | undefined, notes: string) => {
      setIsCompletingRecipe(true);
      try {
        await handleRecipeCompletion(pendingServings.current, rating, notes);
      } finally {
        setIsCompletingRecipe(false);
        setShowRatingModal(false);
      }
    },
    [handleRecipeCompletion]
  );

  const closeRatingModal = useCallback(() => {
    setShowRatingModal(false);
  }, []);

  const skipRatingAndComplete = useCallback(async () => {
    setIsCompletingRecipe(true);
    try {
      await handleRecipeCompletion(pendingServings.current);
    } finally {
      setIsCompletingRecipe(false);
      setShowRatingModal(false);
    }
  }, [handleRecipeCompletion]);

  useAnimatedReaction(
    () => progress.value,
    (progressValue) => {
      if (progressValue >= stepPages.length - 1) {
        scheduleOnRN(updateEndTime);
        scheduleOnRN(animateLoopToIndex, 1);
      } else {
        scheduleOnRN(animateLoopToIndex, 0);
      }
    },
    []
  );

  const goToNextStep = useCallback(
    (servings: number) => {
      log.info("\n═══════════════════════════════════════════════════════════");
      log.info("[RecipeStepsContext] goToNextStep called");
      log.info("[RecipeStepsContext] Current step:", currentStep);
      log.info("[RecipeStepsContext] Total steps:", stepPages.length);
      log.info("[RecipeStepsContext] Servings:", servings);

      if (isCompletingRecipe) {
        log.info("[RecipeStepsContext] Completion already in progress");
        log.info("═══════════════════════════════════════════════════════════\n");
        return;
      }

      if (currentStep < stepPages.length - 1) {
        const nextIndex = currentStep + 1;
        log.info("[RecipeStepsContext] ✅ Moving to next step");
        log.info("[RecipeStepsContext] Next index:", nextIndex);
        log.info("[RecipeStepsContext] About to call setCurrentStep to", nextIndex);
        setCurrentStep(nextIndex);
        log.info("[RecipeStepsContext] setCurrentStep called");

        log.info("[RecipeStepsContext] Carousel ref exists?", !!carouselRef.current);
        log.info("[RecipeStepsContext] About to call carousel.scrollTo");
        carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
        log.info("[RecipeStepsContext] carousel.scrollTo called");
      } else {
        log.info("[RecipeStepsContext] ✅ At end, completing recipe");
        pendingServings.current = servings;
        void skipRatingAndComplete();
      }
      log.info("═══════════════════════════════════════════════════════════\n");
    },
    [currentStep, stepPages.length, isCompletingRecipe, skipRatingAndComplete]
  );

  const goToPreviousStep = useCallback(() => {
    log.info("\n═══════════════════════════════════════════════════════════");
    log.info("[RecipeStepsContext] goToPreviousStep called");
    log.info("[RecipeStepsContext] Current step:", currentStep);

    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      log.info("[RecipeStepsContext] ✅ Moving to previous step");
      log.info("[RecipeStepsContext] Previous index:", prevIndex);
      setCurrentStep(prevIndex);
      log.info("[RecipeStepsContext] About to call carousel.scrollTo");
      carouselRef.current?.scrollTo({ index: prevIndex, animated: true });
      log.info("[RecipeStepsContext] carousel.scrollTo called");
      log.info("[RecipeStepsContext] About to animate loop to index 0");
      loopRef.current?.animateToIndex(0);
      log.info("[RecipeStepsContext] Loop animated");
    } else {
      log.info("[RecipeStepsContext] ⚠️ Already at first step, can't go back");
    }
    log.info("═══════════════════════════════════════════════════════════\n");
  }, [currentStep]);

  // Cleanup on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      // Reset SharedValue to prevent memory leaks
      progress.value = 0;

      // Clear refs to prevent memory leaks
      startTime.current = 0;
      pendingServings.current = 0;

      // Clear carousel ref
      if (carouselRef.current) {
        carouselRef.current = null;
      }

      // Clear loop ref
      if (loopRef.current) {
        loopRef.current = null;
      }

      log.info("[RecipeStepsContext] Cleaned up resources");
    };
  }, [progress]);

  return (
    <RecipeStepsContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        goToNextStep,
        goToPreviousStep,
        carouselRef,
        stepPages,
        progress,
        recipe,
        duration,
        loopRef,
        showRatingModal,
        closeRatingModal,
        saveRatingAndComplete,
        skipRatingAndComplete,
        isCompletingRecipe,
      }}
    >
      {children}
    </RecipeStepsContext.Provider>
  );
}

export const useRecipeSteps = () => {
  const context = useContext(RecipeStepsContext);
  if (!context) {
    throw new Error("useRecipeSteps must be used within a RecipeStepsProvider");
  }
  return context;
};
