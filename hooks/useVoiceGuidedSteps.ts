/**
 * useVoiceGuidedSteps Hook
 *
 * Provides automatic text-to-speech (TTS) functionality for recipe steps.
 * Reads step content aloud as users navigate through the cooking mode.
 *
 * @example
 * ```tsx
 * const { isSpeaking, voiceEnabled, autoReadEnabled, speakCurrentStep, stopSpeaking, toggleVoice, toggleAutoRead } =
 *   useVoiceGuidedSteps({
 *     currentStep: 0,
 *     stepPages: [{ type: "step", content: { step: 1, title: "Preheat", description: "..." } }],
 *     recipe: myRecipe,
 *     onSpeakComplete: () => console.log("Finished speaking")
 *   });
 *
 * // Manually trigger speech
 * speakCurrentStep();
 * ```
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { voiceCookingService } from "~/utils/voice-cooking";
import type { Recipe } from "~/types/Recipe";
import type { StepPageData } from "~/app/recipes/[recipeId]/steps";
import { log } from "~/utils/logger";

/**
 * Options for configuring voice-guided steps behavior
 */
interface UseVoiceGuidedStepsOptions {
  /** Index of the current step being viewed */
  currentStep: number;
  /** Array of step page data for the recipe */
  stepPages: StepPageData[];
  /** The recipe containing the steps */
  recipe: Recipe;
  /** Optional callback invoked when speech completes */
  onSpeakComplete?: () => void;
}

/**
 * Return value for useVoiceGuidedSteps hook
 */
interface UseVoiceGuidedStepsReturn {
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Whether voice guidance is enabled */
  voiceEnabled: boolean;
  /** Whether auto-read on step change is enabled */
  autoReadEnabled: boolean;
  /** Manually trigger speech for the current step */
  speakCurrentStep: () => Promise<void>;
  /** Stop current speech */
  stopSpeaking: () => Promise<void>;
  /** Toggle voice guidance on/off */
  toggleVoice: () => void;
  /** Toggle auto-read on/off */
  toggleAutoRead: () => void;
}

export function useVoiceGuidedSteps({
  currentStep,
  stepPages,
  recipe,
  onSpeakComplete,
}: UseVoiceGuidedStepsOptions): UseVoiceGuidedStepsReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoReadEnabled, setAutoReadEnabled] = useState(false);

  // Refs to prevent stale closures
  const settingsRef = useRef(voiceCookingService.getSettings());
  const isSpeakingRef = useRef(false);
  const lastSpokenStepRef = useRef<number>(-1);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load settings on mount
  useEffect(() => {
    const settings = voiceCookingService.getSettings();
    setVoiceEnabled(settings.enabled);
    setAutoReadEnabled(settings.autoReadSteps);
    settingsRef.current = settings;
  }, []);

  /**
   * Speak the current step content
   */
  const speakCurrentStep = useCallback(async (): Promise<void> => {
    const settings = voiceCookingService.getSettings();

    if (!settings.enabled || !settings.autoReadSteps) {
      log.debug("[VoiceGuidedSteps] Voice or auto-read disabled, skipping");
      return;
    }

    // Don't re-speak the same step
    if (currentStep === lastSpokenStepRef.current) {
      log.debug("[VoiceGuidedSteps] Already spoke this step, skipping");
      return;
    }

    // Get current page data
    const currentPage = stepPages[currentStep];
    if (!currentPage) {
      log.warn("[VoiceGuidedSteps] No page data for step:", currentStep);
      return;
    }

    // Mark this step as spoken after verifying data exists
    // This prevents race conditions with rapid swiping
    lastSpokenStepRef.current = currentStep;
    log.info(`[VoiceGuidedSteps] Speaking step ${currentStep}`);

    // Stop any current speech before starting new speech
    if (isSpeakingRef.current) {
      log.info("[VoiceGuidedSteps] Interrupting current speech to speak new step");
      await voiceCookingService.stop();
    }

    setIsSpeaking(true);
    isSpeakingRef.current = true;

    try {
      switch (currentPage.type) {
        case "ingredients":
          await voiceCookingService.speakIngredients(
            currentPage.content as Array<{ name: string; quantity: number; unit: string }>
          );
          break;

        case "step":
          const stepContent = currentPage.content as { step: number; title: string; description: string };
          await voiceCookingService.speakStep(
            stepContent.step,
            stepContent.title,
            stepContent.description,
            { interrupt: true }
          );
          break;

        case "congratulations":
          // Speak completion message
          const completionMessage = voiceCookingService.getCompletionMessage(
            recipe.title,
            undefined // Duration will be calculated later
          );
          await voiceCookingService.speak(completionMessage, { interrupt: true });
          break;
      }

    } catch (error) {
      log.error("[VoiceGuidedSteps] Error speaking step:", error);
    } finally {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      onSpeakComplete?.();
    }
  }, [currentStep, stepPages, recipe.title, onSpeakComplete]);

  /**
   * Stop current speech
   */
  const stopSpeaking = useCallback(async (): Promise<void> => {
    if (isSpeakingRef.current) {
      await voiceCookingService.stop();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, []);

  /**
   * Toggle voice on/off
   */
  const toggleVoice = useCallback(() => {
    const newEnabled = !voiceEnabled;
    setVoiceEnabled(newEnabled);
    voiceCookingService.updateSettings({ enabled: newEnabled });
    settingsRef.current = { ...settingsRef.current, enabled: newEnabled };

    // Stop speech if disabling
    if (!newEnabled && isSpeakingRef.current) {
      void stopSpeaking();
    }
  }, [voiceEnabled, stopSpeaking]);

  /**
   * Toggle auto-read on/off
   */
  const toggleAutoRead = useCallback(() => {
    const newAutoRead = !autoReadEnabled;
    setAutoReadEnabled(newAutoRead);
    voiceCookingService.updateSettings({ autoReadSteps: newAutoRead });
    settingsRef.current = { ...settingsRef.current, autoReadSteps: newAutoRead };

    // Stop speech if disabling auto-read
    if (!newAutoRead && isSpeakingRef.current) {
      void stopSpeaking();
    }
  }, [autoReadEnabled, stopSpeaking]);

  /**
   * Handle step changes with debouncing
   */
  useEffect(() => {
    const settings = voiceCookingService.getSettings();

    if (!settings.enabled || !settings.autoReadSteps) {
      return;
    }

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Debounce to prevent speech spam during rapid scrolling
    debounceTimerRef.current = setTimeout(() => {
      speakCurrentStep();
      debounceTimerRef.current = null;
    }, 300); // 300ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [currentStep, speakCurrentStep]);

  /**
   * Handle app state changes
   * Stop speech when app backgrounds, resume when foregrounded
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== "active" && isSpeakingRef.current) {
        // App going to background - stop speech
        log.info("[VoiceGuidedSteps] App backgrounded, stopping speech");
        void voiceCookingService.stop();
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
      // Note: We don't auto-resume on foreground to avoid confusion
      // The user can manually navigate to re-trigger speech
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  /**
 * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Stop any ongoing speech
      if (isSpeakingRef.current) {
        void voiceCookingService.stop();
      }

      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isSpeaking,
    voiceEnabled,
    autoReadEnabled,
    speakCurrentStep,
    stopSpeaking,
    toggleVoice,
    toggleAutoRead,
  };
}
