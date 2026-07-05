import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H4 } from "~/components/ui/typography";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import TextLoop from "~/components/ui/TextLoop";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";
import { useSpeechRecognition } from "~/hooks/useSpeechRecognition";
import type { VoiceCommand } from "~/utils/voice-cooking";
import type { Recipe } from "~/types/Recipe";
import { useVoiceCommandHandler } from "~/hooks/useVoiceCommandHandler";
import { MicButton } from "~/components/VoiceCooking/MicButton";
import { useVoiceGuidedSteps } from "~/hooks/useVoiceGuidedSteps";

import type { RecipeStep } from "~/types/Recipe";
import { useTimer } from "~/store/TimerContext";

export default function StepBottomBar() {
  const { bottom } = useSafeAreaInsets();
  const { goToNextStep, goToPreviousStep, loopRef, currentStep, stepPages, recipe } =
    useRecipeSteps();
  const { servings } = useRecipeDetailStore();
  const { createTimer, timers, cancelTimer } = useTimer();

  const voiceGuidedSteps = useVoiceGuidedSteps({
    currentStep,
    stepPages,
    recipe,
  });

  // Get current step data for context
  const currentStepData = stepPages[currentStep]?.content as RecipeStep | null;

  // Handle voice commands
  const handleVoiceCommand = useVoiceCommandHandler({
    recipe,
    currentStep,
    stepPages,
    currentStepData,
    servings,
    goToNextStep,
    goToPreviousStep,
  });

  const { isListening, toggleListening } = useSpeechRecognition({
    onCommand: handleVoiceCommand,
    recipe,
    currentStep: currentStepData ?? undefined,
  });

  return (
    <>
      <View
        className="flex-row justify-between items-center px-6 py-4 gap-3"
        style={{ paddingBottom: bottom + 16 }}
      >
        <MicButton
          isListening={isListening}
          onToggle={toggleListening}
          voiceEnabled={voiceGuidedSteps.voiceEnabled}
          onToggleVoice={voiceGuidedSteps.toggleVoice}
          isSpeaking={voiceGuidedSteps.isSpeaking}
          size="lg"
        />

        <Button
          size="lg"
          onPress={() => goToNextStep(servings)}
          className="bg-foreground/80"
          containerClassName={"flex-1"}
        >
          <TextLoop ref={loopRef} trigger={false}>
            <H4 className="font-urbanist-medium text-background">Continue</H4>
            <H4 className="font-urbanist-medium text-background">Finish</H4>
          </TextLoop>
        </Button>
      </View>
    </>
  );
}
