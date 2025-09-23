import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
} from "react";
import { useRouter } from "expo-router";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import type { ICarouselInstance } from "react-native-reanimated-carousel";
import type { TextLoopRef } from "~/components/ui/TextLoop";
import type { Recipe, RecipeIngredient } from "~/types/Recipe";
import type { PantryItem } from "~/types/PantryItem";
import type { StepPageData } from "~/app/recipes/[recipeId]/steps";
import { storage } from "~/data";
import { RECIPE_COOKED_KEY } from "~/constants/storage-keys";
import {
  usePantryItemsByType,
  useUpdatePantryItem,
  useDeletePantryItem,
} from "~/hooks/queries/usePantryQueries";
import { isIngredientMatch } from "~/utils/ingredient-matching";

// Dictionary to map unit synonyms to their canonical form
const UNIT_SYNONYMS: Record<string, string> = {
  // Empty/piece variations
  "": "piece",
  piece: "piece",
  pieces: "piece",
  units: "piece",
  unit: "piece",

  // Volume measurements
  cup: "cup",
  cups: "cup",
  c: "cup",

  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  tbsp: "tablespoon",
  tbs: "tablespoon",

  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
  tsp: "teaspoon",

  liter: "liter",
  liters: "liter",
  l: "liter",

  milliliter: "milliliter",
  milliliters: "milliliter",
  ml: "milliliter",

  // Weight measurements
  gram: "gram",
  grams: "gram",
  g: "gram",

  kilogram: "kilogram",
  kilograms: "kilogram",
  kg: "kilogram",

  pound: "pound",
  pounds: "pound",
  lb: "pound",
  lbs: "pound",

  ounce: "ounce",
  ounces: "ounce",
  oz: "ounce",
};

/**
 * Normalizes a unit string to its canonical form for comparison
 */
const normalizeUnit = (unit: string): string => {
  const normalized = unit.toLowerCase().trim();
  return UNIT_SYNONYMS[normalized] || normalized;
};

/**
 * Checks if two units are compatible (synonymous)
 */
const areUnitsCompatible = (unit1: string, unit2: string): boolean => {
  return normalizeUnit(unit1) === normalizeUnit(unit2);
};

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
}

const RecipeStepsContext = createContext<RecipeStepsContextType | null>(null);

export function RecipeStepsProvider({
  recipe,
  stepPages,
  children,
}: {
  recipe: Recipe;
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

  const animateLoopToIndex = useCallback((index: number) => {
    loopRef.current?.animateToIndex(index);
  }, []);

  const updateEndTime = useCallback(() => {
    setEndTime(Date.now());
    storage.set(RECIPE_COOKED_KEY, true);
  }, []);

  const handleRecipeCompletion = useCallback(
    async (servings: number) => {
      // Find matching pantry items
      const matches: Array<{
        pantryItem: PantryItem;
        recipeIngredient: RecipeIngredient;
      }> = [];

      recipe.ingredients.forEach((recipeIngredient) => {
        const matchingPantryItem = pantryItems.find((pantryItem) =>
          isIngredientMatch(pantryItem.name, recipeIngredient.name)
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
        const updatePromises = matches.map(
          async ({ pantryItem, recipeIngredient }) => {
            // Calculate reduction amount based on servings
            let baseReductionAmount = 1;

            // Check unit compatibility for proper quantity calculation
            if (areUnitsCompatible(pantryItem.unit, recipeIngredient.unit)) {
              baseReductionAmount = recipeIngredient.quantity;
            }

            // Multiply by servings to get total reduction amount
            const totalReductionAmount = baseReductionAmount * servings;

            const newQuantity = Math.max(
              0,
              pantryItem.quantity - totalReductionAmount
            );

            if (newQuantity <= 0) {
              return deletePantryItemMutation.mutateAsync(pantryItem.id);
            } else {
              return updatePantryItemMutation.mutateAsync({
                id: pantryItem.id,
                updates: { quantity: newQuantity },
              });
            }
          }
        );

        await Promise.all(updatePromises);
      } catch {
        // Silent error handling - errors are handled gracefully
      }

      // Navigate away after processing
      router.dismissTo("/");
    },
    [
      recipe,
      pantryItems,
      router,
      updatePantryItemMutation,
      deletePantryItemMutation,
    ]
  );

  useAnimatedReaction(
    () => progress.value,
    (progressValue) => {
      if (progressValue >= stepPages.length - 1) {
        runOnJS(updateEndTime)();
        runOnJS(animateLoopToIndex)(1);
      } else {
        runOnJS(animateLoopToIndex)(0);
      }
    },
    []
  );

  const goToNextStep = useCallback(
    (servings: number) => {
      if (currentStep < stepPages.length - 1) {
        const nextIndex = currentStep + 1;
        setCurrentStep(nextIndex);
        carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
      } else {
        handleRecipeCompletion(servings);
      }
    },
    [currentStep, stepPages.length, handleRecipeCompletion]
  );

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      const nextIndex = currentStep - 1;
      setCurrentStep(nextIndex);
      carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
      loopRef.current?.animateToIndex(0);
    }
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
