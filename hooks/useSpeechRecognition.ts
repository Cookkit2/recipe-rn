/**
 * useSpeechRecognition Hook
 *
 * Provides continuous speech recognition for hands-free voice commands
 * during cooking. Uses expo-speech-recognition to listen for commands
 * like "next", "previous", "back", etc.
 *
 * Automatically pauses recognition when TTS is speaking to prevent
 * the app from picking up its own voice output.
 */

import { useEffect, useCallback, useState, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { voiceCookingService, type VoiceCommand } from "~/utils/voice-cooking";
import { log } from "~/utils/logger";
import type { Recipe, RecipeStep } from "~/types/Recipe";

interface UseSpeechRecognitionOptions {
  /** Callback to process recognized voice commands */
  onCommand: (
    command: VoiceCommand,
    transcript: string,
    context?: { recipe?: Recipe | null; currentStep?: RecipeStep }
  ) => void | Promise<void>;
  /** Optional recipe context for advanced command parsing */
  recipe?: Recipe | null;
  /** Optional current step context for step-specific commands */
  currentStep?: RecipeStep;
}

// Configuration for kitchen noise robustness
const CONFIDENCE_THRESHOLD = 0.5; // Only process commands with 50%+ confidence
const MIN_TRANSCRIPT_LENGTH = 2; // Minimum characters to process (filters short noise)
const COMMAND_DEBOUNCE_MS = 300; // Wait before processing to ensure user finished speaking

function useCommandProcessor(
  onCommand: UseSpeechRecognitionOptions["onCommand"],
  context: { recipe?: Recipe | null; currentStep?: RecipeStep }
) {
  const lastCommandRef = useRef<string>("");
  const unknownCommandCountRef = useRef(0);
  const lastSuggestionTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const processCommand = useCallback(
    (text: string, confidence: number) => {
      clearDebounce();

      debounceTimerRef.current = setTimeout(() => {
        if (text.trim()) {
          const command = voiceCookingService.parseCommand(text);

          log.info(
            `[SpeechRecognition] Heard "${text}", parsed as "${command}" ` +
              `(confidence: ${confidence.toFixed(2)}, last command: "${lastCommandRef.current}")`
          );

          if (command === "unknown") {
            unknownCommandCountRef.current += 1;
            const now = Date.now();
            const timeSinceLastSuggestion = now - lastSuggestionTimeRef.current;

            if (unknownCommandCountRef.current >= 3 && timeSinceLastSuggestion > 5000) {
              const suggestion = voiceCookingService.getSuggestionMessage();
              log.info(`[SpeechRecognition] Providing suggestion: ${suggestion}`);
              voiceCookingService.speakFeedback(suggestion);
              unknownCommandCountRef.current = 0;
              lastSuggestionTimeRef.current = now;
            }
          } else if (command !== lastCommandRef.current) {
            unknownCommandCountRef.current = 0;
            lastCommandRef.current = command;
            onCommand(command, text, context);

            setTimeout(() => {
              lastCommandRef.current = "";
            }, 2000);
          }
        }
        debounceTimerRef.current = null;
      }, COMMAND_DEBOUNCE_MS);
    },
    [clearDebounce, onCommand, context.recipe, context.currentStep]
  );

  return { processCommand, clearDebounce };
}

function useTTSPauseHandler(
  isListening: boolean,
  shouldBeListeningRef: React.MutableRefObject<boolean>,
  stopRecognition: (updateUI?: boolean) => void,
  scheduleRestart: (delay: number) => void,
  clearRestart: () => void
) {
  const wasListeningBeforeTTSRef = useRef(false);
  const isPausedDueToTTSRef = useRef(false);

  useEffect(() => {
    const unsubscribeStart = voiceCookingService.onSpeakingStart(() => {
      if (isListening || shouldBeListeningRef.current) {
        log.info("[SpeechRecognition] Pausing recognition - TTS is speaking");
        wasListeningBeforeTTSRef.current = true;
        isPausedDueToTTSRef.current = true;
        stopRecognition(false); // Don't update UI - keep showing as listening
        clearRestart();
      }
    });

    const unsubscribeFinish = voiceCookingService.onSpeakingFinish(() => {
      if (wasListeningBeforeTTSRef.current && shouldBeListeningRef.current) {
        log.info("[SpeechRecognition] Resuming recognition - TTS finished");
        wasListeningBeforeTTSRef.current = false;
        // Keep ignoring for a longer period to ensure TTS audio clears completely
        setTimeout(() => {
          log.info("[SpeechRecognition] TTS safety window expired, now accepting commands");
          isPausedDueToTTSRef.current = false;
        }, 1000); // Increased to 1 second
        scheduleRestart(500); // Increased restart delay
      }
    });

    return () => {
      unsubscribeStart();
      unsubscribeFinish();
    };
  }, [isListening, stopRecognition, clearRestart, scheduleRestart, shouldBeListeningRef]);

  return isPausedDueToTTSRef;
}

export function useSpeechRecognition({
  onCommand,
  recipe,
  currentStep,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const shouldBeListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { processCommand, clearDebounce } = useCommandProcessor(onCommand, { recipe, currentStep });

  const clearRestart = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: true,
      androidIntentOptions: {
        EXTRA_LANGUAGE_MODEL: "free_form",
      },
      iosTaskHint: "confirmation",
    });
  }, []);

  const stopRecognition = useCallback((updateUI = true) => {
    ExpoSpeechRecognitionModule.abort();
    if (updateUI) {
      setIsListening(false);
    }
  }, []);

  const scheduleRestart = useCallback(
    (delay: number) => {
      clearRestart();
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (shouldBeListeningRef.current) {
          startRecognition();
        }
      }, delay);
    },
    [clearRestart, startRecognition]
  );

  const isPausedDueToTTSRef = useTTSPauseHandler(
    isListening,
    shouldBeListeningRef,
    stopRecognition,
    scheduleRestart,
    clearRestart
  );

  useSpeechRecognitionEvent("start", () => {
    if (!isPausedDueToTTSRef.current) {
      setIsListening(true);
    }
    log.info("[SpeechRecognition] Started listening");
  });

  useSpeechRecognitionEvent("end", () => {
    if (!isPausedDueToTTSRef.current) {
      setIsListening(false);
    }
    log.info("[SpeechRecognition] Stopped listening");

    if (shouldBeListeningRef.current && !isPausedDueToTTSRef.current) {
      scheduleRestart(500);
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";
    const confidence = event.results[0]?.confidence ?? 0;
    setTranscript(text);

    if (voiceCookingService.getIsSpeaking() || isPausedDueToTTSRef.current) {
      log.debug(
        `[SpeechRecognition] Ignoring command "${text}" - ` +
          `TTS speaking: ${voiceCookingService.getIsSpeaking()}, ` +
          `Paused due to TTS: ${isPausedDueToTTSRef.current}`
      );
      return;
    }

    if (confidence < CONFIDENCE_THRESHOLD) {
      log.debug(
        `[SpeechRecognition] Ignoring low-confidence result "${text}" ` +
          `(confidence: ${confidence.toFixed(2)} < threshold: ${CONFIDENCE_THRESHOLD})`
      );
      return;
    }

    if (text.trim().length < MIN_TRANSCRIPT_LENGTH) {
      log.debug(
        `[SpeechRecognition] Ignoring short transcription "${text}" ` +
          `(length: ${text.trim().length} < minimum: ${MIN_TRANSCRIPT_LENGTH})`
      );
      return;
    }

    processCommand(text, confidence);
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "no-speech") {
      return;
    }

    log.warn("[SpeechRecognition] Error:", event.error, event.message);

    if (event.error === "not-allowed") {
      shouldBeListeningRef.current = false;
      setIsListening(false);
      clearRestart();
    }
  });

  const startListening = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      log.warn("[SpeechRecognition] Permissions not granted");
      return;
    }

    shouldBeListeningRef.current = true;
    startRecognition();
  }, [startRecognition]);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    clearRestart();
    clearDebounce();
    ExpoSpeechRecognitionModule.abort();
    setIsListening(false);
    setTranscript("");
  }, [clearRestart, clearDebounce]);

  const toggleListening = useCallback(() => {
    if (shouldBeListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== "active" && shouldBeListeningRef.current) {
        clearRestart();
        ExpoSpeechRecognitionModule.abort();
      } else if (nextAppState === "active" && shouldBeListeningRef.current) {
        scheduleRestart(300);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [clearRestart, scheduleRestart]);

  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      clearRestart();
      clearDebounce();
      ExpoSpeechRecognitionModule.abort();
    };
  }, [clearRestart, clearDebounce]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}
