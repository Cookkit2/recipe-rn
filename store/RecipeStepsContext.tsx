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
import { RECIPE_COOKED_KEY } from "~/constants/storage-keys";
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
      try {
        await database.recordCooking(baseRecipeId, {
          rating,
          notes: notes || `Cooked ${servings} serving${servings !== 1 ? "s" : ""}`,
          servingsMade: servings,
        });

        // Check for achievements after recording cooking
        // This will trigger achievement checks and unlock any newly achieved milestones
        await achievementService.checkAchievements();
      } catch {
        // Continue even if recording fails
      }

      // Find matching pantry items
      const matches: Array<{
        pantryItem: PantryItem;
        recipeIngredient: RecipeIngredient;
      }> = [];

      recipe.ingredients.forEach((recipeIngredient) => {
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

      // If no matches found, just navigate away
      if (matches.length === 0) {
        router.dismissTo("/");
        return;
      }

      // Automatically deduct ingredients without showing alerts
      try {
        const updatePromises = matches.map(async ({ pantryItem, recipeIngredient }) => {
          let reductionInPantryUnits: number;

          // Check if dimensions are compatible (both weight, both volume, etc.)
          if (areDimensionsCompatible(pantryItem.unit, recipeIngredient.unit)) {
            // Convert both to base units for accurate comparison
            const recipeInBase = convertToBaseUnit(
              recipeIngredient.quantity,
              recipeIngredient.unit
            );
            const pantryInBase = convertToBaseUnit(pantryItem.quantity, pantryItem.unit);

            if (pantryInBase > 0) {
              // Calculate reduction as a proportion of pantry quantity
              // E.g., if recipe needs 50ml and pantry has 1L (1000ml), reduce by 50/1000 * 1 = 0.05L
              reductionInPantryUnits = (recipeInBase / pantryInBase) * pantryItem.quantity;
            } else {
              reductionInPantryUnits = 0;
            }
          } else {
            // Incompatible dimensions or unknown units
            // If both units normalize to the same string, assume they're compatible
            const normalizedPantryUnit = pantryItem.unit.toLowerCase().trim();
            const normalizedRecipeUnit = recipeIngredient.unit.toLowerCase().trim();

            if (normalizedPantryUnit === normalizedRecipeUnit) {
              // Same unit (case-insensitive), deduct recipe quantity
              reductionInPantryUnits = recipeIngredient.quantity;
            } else {
              // Different unknown units, fall back to deducting 1 unit
              reductionInPantryUnits = 1;
            }
          }

          // Multiply by servings to get total reduction amount
          const totalReductionAmount = reductionInPantryUnits * servings;
          const newQuantity = roundToReasonablePrecision(
            Math.max(0, pantryItem.quantity - totalReductionAmount)
          );

          if (newQuantity <= 0) {
            return deletePantryItemMutation.mutateAsync(pantryItem.id);
          } else {
            return updatePantryItemMutation.mutateAsync({
              id: pantryItem.id,
              updates: { quantity: newQuantity },
            });
          }
        });

        await Promise.all(updatePromises);
      } catch {
        // Silent error handling - errors are handled gracefully
      }

      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: cookingHistoryQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: cookingHistoryQueryKeys.recipeCookCount(baseRecipeId),
      });

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
        log.info("[RecipeStepsContext] ✅ At end, showing rating modal");
        // Store the servings for the completion
        pendingServings.current = servings;
        // Show the rating modal instead of completing directly
        setShowRatingModal(true);
      }
      log.info("═══════════════════════════════════════════════════════════\n");
    },
    [currentStep, stepPages.length]
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
