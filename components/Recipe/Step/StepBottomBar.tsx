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
import { useCallback } from "react";
import { MicButton } from "~/components/VoiceCooking/MicButton";
import { useVoiceGuidedSteps } from "~/hooks/useVoiceGuidedSteps";
import { voiceCommandParser } from "~/utils/voice-command-parser";
import { voiceAnswerGenerator } from "~/utils/voice-answer-generator";
import { voiceCookingService } from "~/utils/voice-cooking";
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
  const handleVoiceCommand = useCallback(
    async (
      command: VoiceCommand,
      transcript: string,
      context?: { recipe?: Recipe | null; currentStep?: RecipeStep }
    ) => {
      // Use provided recipe from context or fall back to component's recipe
      const commandRecipe = context?.recipe ?? recipe;

      switch (command) {
        case "next": {
          goToNextStep(servings);
          const answer = voiceAnswerGenerator.generateNavigationConfirmation(
            "next",
            currentStep + 2,
            stepPages.length
          );
          voiceAnswerGenerator.speakAnswer(answer);
          break;
        }
        case "previous":
        case "back": {
          goToPreviousStep();
          const answer = voiceAnswerGenerator.generateNavigationConfirmation("back", currentStep);
          voiceAnswerGenerator.speakAnswer(answer);
          break;
        }
        case "done": {
          if (currentStep === stepPages.length - 1) {
            goToNextStep(servings);
            const answer = voiceAnswerGenerator.generateNavigationConfirmation(
              "next",
              currentStep + 2,
              stepPages.length
            );
            voiceAnswerGenerator.speakAnswer(answer);
          }
          break;
        }
        case "ingredient_amount": {
          // Parse the command to extract ingredient using recipe from context
          const parsed = voiceCommandParser.parseCommand(transcript, commandRecipe);
          if (parsed.type === "ingredient_amount" && parsed.ingredient) {
            const answer = voiceAnswerGenerator.generateIngredientAmount(
              parsed.ingredient.name,
              parsed.ingredient.quantity,
              parsed.ingredient.unit
            );
            voiceAnswerGenerator.speakAnswer(answer);
          } else {
            // Ingredient not found
            const answer = voiceAnswerGenerator.generateIngredientNotFound(transcript);
            voiceAnswerGenerator.speakAnswer(answer);
          }
          break;
        }
        case "temperature": {
          // Extract temperature from recipe using context
          const tempInfo = voiceCommandParser.extractTemperature(commandRecipe);
          if (tempInfo) {
            const answer = voiceAnswerGenerator.generateTemperatureInfo(tempInfo);
            voiceAnswerGenerator.speakAnswer(answer);
          } else {
            const answer = voiceAnswerGenerator.generateNoTemperatureFound(
              commandRecipe?.title ?? recipe?.title ?? "this recipe"
            );
            voiceAnswerGenerator.speakAnswer(answer);
          }
          break;
        }
        case "clarify_step": {
          // Re-read current step with emphasis - use context step if provided
          const stepToRead = context?.currentStep ?? currentStepData;
          if (stepToRead) {
            await voiceCookingService.speakStep(
              stepToRead.step,
              `Here's step ${stepToRead.step}`,
              stepToRead.description,
              { interrupt: true }
            );
          }
          break;
        }
        case "help": {
          // Speak help response
          const answer = voiceAnswerGenerator.generateHelpResponse();
          voiceAnswerGenerator.speakAnswer(answer);
          break;
        }
        case "repeat": {
          // Re-read current step - use context step if provided
          const stepToRead = context?.currentStep ?? currentStepData;
          if (stepToRead) {
            await voiceCookingService.speakStep(
              stepToRead.step,
              stepToRead.title,
              stepToRead.description,
              { interrupt: true }
            );
          }
          break;
        }
      }
    },
    [
      goToNextStep,
      goToPreviousStep,
      currentStep,
      stepPages,
      stepPages.length,
      servings,
      recipe,
      currentStepData,
    ]
  );

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
