import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
} from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import type { ICarouselInstance } from "react-native-reanimated-carousel";
import type { StepPageData } from "~/app/recipes/[recipeId]/steps";

interface RecipeStepsContextType {
  currentStep: number;
  setCurrentStep: (value: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  carouselRef: React.RefObject<ICarouselInstance | null>;
  stepPages: StepPageData[];
  progress: SharedValue<number>;
}

const RecipeStepsContext = createContext<RecipeStepsContextType | null>(null);

export function RecipeStepsProvider({
  stepPages,
  children,
}: {
  stepPages: StepPageData[];
  children: React.ReactNode;
}) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const carouselRef = useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);

  const goToNextStep = useCallback(() => {
    if (currentStep < stepPages.length - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
    }
  }, [currentStep, stepPages]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      const nextIndex = currentStep - 1;
      setCurrentStep(nextIndex);
      carouselRef.current?.scrollTo({ index: nextIndex, animated: true });
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
