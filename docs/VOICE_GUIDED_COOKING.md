# Voice-Guided Cooking Mode

This feature adds hands-free, voice-guided cooking using Expo Speech for text-to-speech.

## Overview

Users can now:

- Have steps read aloud automatically as they navigate
- Control navigation with voice commands
- Customize speech rate and pitch
- Toggle voice guidance on/off anytime

## Architecture

### Components

1. **`utils/voice-cooking.ts`** - Core voice service
   - Text-to-speech using Expo Speech
   - Voice command parsing
   - Settings management

2. **`hooks/useVoiceCooking.ts`** - React hooks
   - `useVoiceCookingInit()` - Initialize on app startup
   - `useVoiceCookingSettings()` - Manage settings
   - `useVoiceGuidedSteps()` - Main hook for step navigation
   - `useCompletionSpeech()` - Speak completion message

3. **`components/VoiceCooking/VoiceControlButton.tsx`** - UI components
   - `VoiceControlButton` - Toggle button with speaking animation
   - `VoiceControlBar` - Full control bar with status
   - `VoiceFAB` - Floating action button

4. **`components/Settings/VoiceCookingSettings.tsx`** - Settings UI
   - Toggle voice on/off
   - Toggle auto-read steps
   - Speech rate slider
   - Voice pitch slider
   - Test voice button

## Usage

### Initialize on App Startup

```tsx
import { useVoiceCookingInit } from "~/hooks/useVoiceCooking";

function RootLayout() {
  useVoiceCookingInit();
  // ...
}
```

### Add Voice Controls to Recipe Steps

```tsx
import { useVoiceGuidedSteps } from "~/hooks/useVoiceCooking";
import { VoiceFAB } from "~/components/VoiceCooking/VoiceControlButton";

function RecipeStepsScreen() {
  const { currentStep, goToNextStep, goToPreviousStep, stepPages, recipe } = useRecipeSteps();

  const { isSpeaking, voiceEnabled, toggleVoice, speakCurrentStep } = useVoiceGuidedSteps({
    currentStep,
    totalSteps: stepPages.length,
    onNext: () => goToNextStep(recipe.servings),
    onPrevious: goToPreviousStep,
    getCurrentStepContent: () => {
      const page = stepPages[currentStep];
      if (page.type !== "step" || !page.content) return null;
      const step = page.content as RecipeStep;
      return {
        stepNumber: step.step,
        title: step.title,
        description: step.description,
      };
    },
    getIngredients: () => recipe.ingredients,
  });

  return (
    <View className="flex-1">
      {/* Your step content */}

      {/* Voice FAB */}
      <VoiceFAB
        isEnabled={voiceEnabled}
        isSpeaking={isSpeaking}
        onToggle={toggleVoice}
        onLongPress={speakCurrentStep}
      />
    </View>
  );
}
```

### Settings Screen

```tsx
import { VoiceCookingSettings } from "~/components/Settings/VoiceCookingSettings";

function SettingsScreen() {
  return (
    <ScrollView>
      <VoiceCookingSettings />
    </ScrollView>
  );
}
```

## Voice Commands

The system can parse these voice commands (for future speech recognition integration):

| Command       | Aliases                              | Action                            |
| ------------- | ------------------------------------ | --------------------------------- |
| `next`        | "continue", "forward", "go"          | Go to next step                   |
| `previous`    | "back", "go back", "last step"       | Go to previous step               |
| `repeat`      | "again", "say again", "read again"   | Repeat current step               |
| `stop`        | "quiet", "silence", "shut up"        | Stop speaking                     |
| `ingredients` | "what do I need", "list ingredients" | Read all ingredients              |
| `done`        | "finish", "complete"                 | Complete recipe (if on last step) |

## Settings Storage

Settings are stored in MMKV under key `voice:cooking_settings`:

```typescript
interface VoiceCookingSettings {
  enabled: boolean; // Master toggle
  autoReadSteps: boolean; // Auto-read on navigation
  speechRate: number; // 0.5 - 1.5 (1.0 = normal)
  speechPitch: number; // 0.5 - 1.5 (1.0 = normal)
  language: string; // e.g., "en-US"
  voice?: string; // Specific voice identifier
}
```

## Features

### Auto-Read Steps

When enabled, each step is automatically read aloud when the user navigates to it.

### Speech Customization

- **Speed**: Slower for beginners, faster for experienced cooks
- **Pitch**: Customize voice tone preference

### Speaking Animation

The voice button pulses when speaking, providing visual feedback.

### App State Handling

Speech automatically stops when the app goes to background.

## Dependencies

- `expo-speech` - For text-to-speech functionality
- `expo-haptics` - For button feedback

## Installation

The package is added to `package.json`. Run:

```bash
npm install
# or
yarn
```

## Future Enhancements

1. **Speech Recognition** - Add microphone input for true voice commands
2. **Timer Integration** - "Set timer for 10 minutes" command
3. **Multiple Languages** - Support for non-English recipes
4. **Voice Selection** - Let users choose from available system voices

## Notes

- Uses device's native TTS engine (no API keys needed)
- Works offline
- Respects system accessibility settings
- Pauses when app goes to background
