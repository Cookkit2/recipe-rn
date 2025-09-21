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
import type { Recipe } from "~/types/Recipe";
import type { StepPageData } from "~/app/recipes/[recipeId]/steps";
import { storage } from "~/data";
import { RECIPE_COOKED_KEY } from "~/constants/storage-keys";

interface RecipeStepsContextType {
  currentStep: number;
  setCurrentStep: (value: number) => void;
  goToNextStep: () => void;
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

  const goToNextStep = useCallback(() => {
    if (currentStep < stepPages.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
    } else {
      router.dismissTo("/");
    }
  }, [currentStep, router, stepPages.length]);

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
