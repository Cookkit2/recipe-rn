/**
 * Voice Cooking Service
 *
 * Provides text-to-speech and voice command functionality for hands-free cooking.
 * Uses Expo Speech for TTS and optional speech recognition.
 */

import * as Speech from "expo-speech";
import { log } from "~/utils/logger";
import { storage } from "~/data";
import { VOICE_COOKING_SETTINGS_KEY } from "~/constants/storage-keys";

export interface VoiceCookingSettingsType {
  enabled: boolean;
  autoReadSteps: boolean; // Automatically read step when navigating
  speechRate: number; // 0.5 - 1.5 (1.0 is normal)
  speechPitch: number; // 0.5 - 1.5 (1.0 is normal)
  language: string; // Language code (e.g., "en-US")
  voice?: string; // Voice identifier
}

const DEFAULT_SETTINGS: VoiceCookingSettingsType = {
  enabled: true,
  autoReadSteps: true,
  speechRate: 0.9,
  speechPitch: 1.0,
  language: "en-US",
};

// Voice commands that the app will recognize
export type VoiceCommand =
  | "next"
  | "previous"
  | "back"
  | "repeat"
  | "read"
  | "stop"
  | "pause"
  | "ingredients"
  | "ingredient_amount"
  | "timer"
  | "temperature"
  | "clarify_step"
  | "help"
  | "done"
  | "unknown";

// Keywords for voice command detection
const COMMAND_KEYWORDS: Record<VoiceCommand, string[]> = {
  next: ["next", "continue", "forward", "go forward", "next step"],
  previous: ["back", "go back"],
  back: ["back", "go back"],
  repeat: ["repeat", "again", "say again", "read again"],
  read: ["read", "read step", "what's the step", "tell me"],
  stop: ["stop", "quiet", "silence", "shut up", "be quiet"],
  pause: ["pause", "wait", "hold on"],
  ingredients: ["ingredients", "what do I need", "list ingredients"],
  ingredient_amount: ["how much", "how many", "amount", "quantity", "how much of", "how many of"],
  timer: ["timer", "set timer", "start timer", "how long"],
  temperature: [
    "temperature",
    "temp",
    "heat",
    "how hot",
    "degrees",
    "oven temp",
    "temperature setting",
  ],
  clarify_step: [
    "clarify",
    "explain more",
    "what does that mean",
    "tell me more",
    "explain again",
    "more details",
    "what do you mean",
  ],
  help: ["help", "what can i say", "commands", "what can you do", "assist", "instructions"],
  done: ["done", "finish", "complete", "finished"],
  unknown: [],
};

class VoiceCookingService {
  private isSpeaking = false;
  private availableVoices: Speech.Voice[] = [];
  private speakingCallbacks: Set<() => void> = new Set();
  private finishedCallbacks: Set<() => void> = new Set();

  /**
   * Register a callback to be invoked when TTS starts speaking
   */
  onSpeakingStart(callback: () => void): () => void {
    this.speakingCallbacks.add(callback);
    return () => this.speakingCallbacks.delete(callback);
  }

  /**
   * Register a callback to be invoked when TTS finishes speaking
   */
  onSpeakingFinish(callback: () => void): () => void {
    this.finishedCallbacks.add(callback);
    return () => this.finishedCallbacks.delete(callback);
  }

  private notifySpeakingStart(): void {
    this.speakingCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        log.error("Error in speaking start callback:", error);
      }
    });
  }

  private notifySpeakingFinish(): void {
    this.finishedCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        log.error("Error in speaking finish callback:", error);
      }
    });
  }

  /**
   * Initialize the voice service
   */
  async initialize(): Promise<void> {
    try {
      // Get available voices
      this.availableVoices = await Speech.getAvailableVoicesAsync();
      log.info(`Voice service initialized with ${this.availableVoices.length} voices`);
    } catch (error) {
      log.error("Failed to initialize voice service:", error);
    }
  }

  /**
   * Get current settings
   */
  getSettings(): VoiceCookingSettingsType {
    try {
      const stored = storage.get(VOICE_COOKING_SETTINGS_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored as string) };
      }
    } catch (error) {
      log.warn("Failed to parse voice settings:", error);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<VoiceCookingSettingsType>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    storage.set(VOICE_COOKING_SETTINGS_KEY, JSON.stringify(updated));
    log.info("Voice settings updated:", updated);
  }

  /**
   * Get available voices for the current language
   */
  getAvailableVoices(language?: string): Speech.Voice[] {
    if (!language) {
      return this.availableVoices;
    }
    return this.availableVoices.filter((voice) =>
      voice.language.startsWith(language.split("-")[0] ?? "")
    );
  }

  /**
   * Speak text using TTS
   */
  async speak(
    text: string,
    options?: { interrupt?: boolean; onDone?: () => void; onStart?: () => void }
  ): Promise<void> {
    const settings = this.getSettings();

    if (!settings.enabled) {
      log.debug("Voice cooking disabled, skipping speech");
      return;
    }

    // Stop current speech if interrupt is true
    if (options?.interrupt && this.isSpeaking) {
      await this.stop();
    }

    // Wait for current speech to finish if not interrupting
    if (this.isSpeaking && !options?.interrupt) {
      log.debug("Already speaking, waiting...");
      return;
    }

    this.isSpeaking = true;
    this.notifySpeakingStart();

    return new Promise((resolve) => {
      Speech.speak(text, {
        language: settings.language,
        rate: settings.speechRate,
        pitch: settings.speechPitch,
        voice: settings.voice,
        onStart: () => {
          options?.onStart?.();
        },
        onDone: () => {
          this.isSpeaking = false;
          this.notifySpeakingFinish();
          options?.onDone?.();
          resolve();
        },
        onError: (error) => {
          log.error("Speech error:", error);
          this.isSpeaking = false;
          this.notifySpeakingFinish();
          resolve();
        },
        onStopped: () => {
          this.isSpeaking = false;
          this.notifySpeakingFinish();
          resolve();
        },
      });
    });
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    if (this.isSpeaking) {
      this.isSpeaking = false;
      await Speech.stop();
      // Note: notifySpeakingFinish() is called by onStopped callback from Speech.speak
      // so we don't call it here to avoid duplicate notifications
    }
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Speak a cooking step with natural formatting
   */
  async speakStep(
    stepNumber: number,
    title: string,
    description: string,
    options?: { interrupt?: boolean }
  ): Promise<void> {
    const stepText = this.formatStepForSpeech(stepNumber, title, description);
    await this.speak(stepText, options);
  }

  /**
   * Format a step for natural speech
   */
  formatStepForSpeech(stepNumber: number, title: string, description: string): string {
    // Add natural pauses and structure
    let speech = `Step ${stepNumber}. ${title}.`;

    // Add description with pause (using periods for natural pauses)
    if (description) {
      speech += ` ${description}`;
    }

    return speech;
  }

  /**
   * Speak ingredients list with natural formatting
   */
  async speakIngredients(
    ingredients: Array<{ name: string; quantity: number; unit: string }>
  ): Promise<void> {
    const ingredientsText = this.formatIngredientsForSpeech(ingredients);
    await this.speak(ingredientsText, { interrupt: true });
  }

  /**
   * Format ingredients list for natural speech
   */
  formatIngredientsForSpeech(
    ingredients: Array<{ name: string; quantity: number; unit: string }>
  ): string {
    if (ingredients.length === 0) {
      return "You don't need any ingredients for this recipe.";
    }

    const intro = `You'll need ${ingredients.length} ingredient${ingredients.length > 1 ? "s" : ""}.`;
    const ingredientList = ingredients
      .map((ing) => `${ing.quantity} ${ing.unit} of ${ing.name}`)
      .join(". ");

    return `${intro} ${ingredientList}`;
  }

  /**
   * Speak a quick confirmation or feedback
   */
  async speakFeedback(message: string): Promise<void> {
    await this.speak(message, { interrupt: true });
  }

  /**
   * Parse a voice command from text
   */
  parseCommand(text: string): VoiceCommand {
    const normalizedText = text.toLowerCase().trim();

    for (const [command, keywords] of Object.entries(COMMAND_KEYWORDS)) {
      if (command === "unknown") continue;

      for (const keyword of keywords) {
        if (normalizedText.includes(keyword)) {
          return command as VoiceCommand;
        }
      }
    }

    return "unknown";
  }

  /**
   * Format time for speech (e.g., "10 minutes" or "1 hour and 30 minutes")
   */
  formatTimeForSpeech(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }

    return `${hours} hour${hours !== 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
  }

  /**
   * Generate a cooking completion message
   */
  getCompletionMessage(recipeName: string, durationMinutes?: number): string {
    let message = `Congratulations! You've finished cooking ${recipeName}.`;

    if (durationMinutes) {
      message += ` It took you ${this.formatTimeForSpeech(durationMinutes)}.`;
    }

    message += " Enjoy your meal!";
    return message;
  }

  /**
   * Get a helpful suggestion message for unrecognized commands
   */
  getSuggestionMessage(): string {
    const suggestions = [
      "Try saying next, previous, or repeat.",
      "You can say: next, previous, ingredients, or help.",
      "Try saying: next step, go back, or what do I need.",
      "Say help to hear all available commands.",
    ];
    // Pick a random suggestion
    const index = Math.floor(Math.random() * suggestions.length);
    const suggestion = suggestions[index];
    return suggestion!;
  }

  /**
   * Get all available commands as a help message
   */
  getHelpMessage(): string {
    return "You can say: next, previous, back, repeat, read step, ingredients, how much, timer, temperature, clarify, help, or done.";
  }
}

// Singleton instance
export const voiceCookingService = new VoiceCookingService();
