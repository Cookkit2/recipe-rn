import { useCallback } from "react";
import type { VoiceCommand } from "~/utils/voice-cooking";
import type { Recipe, RecipeStep, StepPageData } from "~/types/Recipe";
import { voiceCommandParser } from "~/utils/voice-command-parser";
import { voiceAnswerGenerator } from "~/utils/voice-answer-generator";
import { voiceCookingService } from "~/utils/voice-cooking";

interface UseVoiceCommandHandlerProps {
  recipe: Recipe | null;
  currentStep: number;
  stepPages: StepPageData[];
  currentStepData: RecipeStep | null;
  servings: number;
  goToNextStep: (servings: number) => void;
  goToPreviousStep: () => void;
}

export function useVoiceCommandHandler({
  recipe,
  currentStep,
  stepPages,
  currentStepData,
  servings,
  goToNextStep,
  goToPreviousStep,
}: UseVoiceCommandHandlerProps) {
  return useCallback(
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
    [goToNextStep, goToPreviousStep, currentStep, stepPages, servings, recipe, currentStepData]
  );
}
