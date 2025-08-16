import { ArrowLeftIcon, ArrowRightIcon } from "lucide-nativewind";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { P } from "~/components/ui/typography";
import { useRecipeSteps } from "~/store/context/RecipeStepsContext";

export default function StepBottomBar() {
  const { bottom } = useSafeAreaInsets();
  const { currentStep, goToNextStep, goToPreviousStep, stepPages } =
    useRecipeSteps();

  return (
    <View
      className="flex-row justify-between items-center px-6 py-4"
      style={{ paddingBottom: bottom + 16 }}
    >
      <Button
        onPress={goToPreviousStep}
        disabled={currentStep === 0}
        variant="secondary"
        size="sm"
        className="flex-row items-center gap-1"
      >
        <ArrowLeftIcon size={20} className="text-foreground" />
        <P className="text-foreground">Prev</P>
      </Button>
      <Button
        onPress={goToNextStep}
        disabled={currentStep === stepPages.length - 1}
        variant="default"
        size="sm"
        className="flex-row items-center gap-1"
      >
        <P className="text-background">Next</P>
        <ArrowRightIcon size={20} className="text-background" />
      </Button>
    </View>
  );
}
