/**
 * Voice-dictation batch pantry entry ("speak your fridge") — issue #721.
 *
 * Hosts a single-tap mic flow that reuses the existing useSpeechRecognition
 * hook (the same engine driving voice COOKING). The pantry caller passes a
 * different onCommand that consumes the transcript string directly, with null
 * recipe/currentStep context, so the cooking flow is untouched.
 *
 * On stop, the transcript is parsed by the pure pantry-voice-parser and the
 * candidates are pushed into CreateIngredientContext via pushVoiceCandidates,
 * then the user is routed to the existing confirmation.tsx correction sheet.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Mic, MicOff } from "lucide-react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useSpeechRecognition } from "~/hooks/useSpeechRecognition";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import { parsePantryTranscript } from "~/utils/pantry-voice-parser";
import { log } from "~/utils/logger";
import { H1, H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import useColors from "~/hooks/useColor";

type PermissionState = "unknown" | "granted" | "denied";

function PermissionDeniedFallback() {
  const router = useRouter();
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-background items-center justify-center px-6"
      style={{ paddingTop: top, paddingBottom: bottom }}
    >
      <MicOff size={48} color={colors.mutedForeground} />
      <H1 className="text-foreground mt-4 text-center">Microphone disabled</H1>
      <P className="text-muted-foreground text-center mt-2">
        To speak your fridge, enable microphone access in Settings. You can still add items one at a
        time with the camera.
      </P>
      <View className="flex-row gap-3 mt-6">
        <Button variant="default" onPress={() => router.push("/ingredient/create")}>
          <H4 className="text-background font-urbanist font-semibold">Use camera</H4>
        </Button>
        <Button variant="secondary" onPress={() => router.back()}>
          <H4 className="text-foreground font-urbanist font-semibold">Go back</H4>
        </Button>
      </View>
    </View>
  );
}

function useVoicePantryCreateLogic() {
  const router = useRouter();
  const { pushVoiceCandidates } = useCreateIngredientStore();

  const [permission, setPermission] = useState<PermissionState>("unknown");
  // Most recent finalized transcript (accumulated across result events).
  const lastTranscriptRef = useRef<string>("");
  const [isReviewing, setIsReviewing] = useState(false);

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
    // The pantry caller ignores the parsed VoiceCommand (1st arg) and only
    // consumes the raw transcript (2nd arg). recipe/currentStep are nulled so
    // the cooking-specific context never engages for this caller.
    onCommand: (_command, transcriptText) => {
      if (transcriptText && transcriptText.trim().length > 0) {
        lastTranscriptRef.current = transcriptText;
      }
    },
    recipe: null,
    currentStep: undefined,
  });

  // Check mic/speech permission on mount so we can show the denied fallback.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        if (!mounted) return;
        setPermission(status.granted ? "granted" : "denied");
      } catch (error) {
        log.warn("[voice-pantry] failed to read speech permission status", { error });
        if (mounted) setPermission("unknown");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStart = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    lastTranscriptRef.current = "";
    // startListening requests permissions internally; if the user denies, the
    // hook logs a warning and no-ops. Reflect that in our local UI state.
    await startListening();
    try {
      const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      setPermission(status.granted ? "granted" : "denied");
      if (!status.granted) {
        log.warn("[voice-pantry] microphone permission denied");
      } else {
        log.info("[voice-pantry] permission granted, listening");
      }
    } catch {
      // Non-fatal: the hook's own permission check governs behavior.
    }
  }, [startListening]);

  const handleReview = useCallback(() => {
    stopListening();
    setIsReviewing(true);

    const finalTranscript = (transcript || lastTranscriptRef.current).trim();
    const parseStart = Date.now();
    const candidates = parsePantryTranscript(finalTranscript);
    const parseMs = Date.now() - parseStart;

    log.info("[voice-pantry] parse result", {
      candidateCount: candidates.length,
      parseMs,
      transcriptLength: finalTranscript.length,
    });

    if (candidates.length === 0 && finalTranscript.length > 0) {
      log.warn("[voice-pantry] failed to parse any candidates from transcript", {
        transcript: finalTranscript,
      });
    }

    pushVoiceCandidates(candidates);
    router.push("/ingredient/(create)/confirmation");
  }, [stopListening, transcript, pushVoiceCandidates, router]);

  const handleToggle = useCallback(() => {
    if (isListening) {
      handleReview();
    } else {
      void handleStart();
    }
  }, [isListening, handleStart, handleReview]);

  return { permission, isListening, transcript, isReviewing, handleToggle };
}

export default function VoicePantryCreate() {
  const router = useRouter();
  const colors = useColors();
  const { top, bottom } = useSafeAreaInsets();

  const { permission, isListening, transcript, isReviewing, handleToggle } =
    useVoicePantryCreateLogic();

  // ---- Denied / unsupported fallback: hand off to manual camera entry ----
  if (permission === "denied") {
    return <PermissionDeniedFallback />;
  }

  return (
    <View
      className="flex-1 bg-background items-center justify-center px-6"
      style={{ paddingTop: top, paddingBottom: bottom }}
    >
      <H1 className="text-foreground text-center">Speak your fridge</H1>
      <P className="text-muted-foreground text-center mt-2">
        Tap the mic and list your ingredients in one go — “two eggs, milk and cheddar”.
      </P>

      <Button
        size="lg"
        variant={isListening ? "default" : "secondary"}
        className="rounded-full mt-8"
        onPress={handleToggle}
        disabled={isReviewing}
      >
        <View className="flex-row items-center gap-2">
          {isReviewing ? (
            <ActivityIndicator />
          ) : isListening ? (
            <Mic color={colors.background} />
          ) : (
            <Mic color={colors.foreground} />
          )}
          <H4 className={isListening ? "text-background" : "text-foreground"}>
            {isReviewing ? "Reviewing…" : isListening ? "Listening — tap to finish" : "Start"}
          </H4>
        </View>
      </Button>

      {transcript ? (
        <View className="mt-8 px-4">
          <P className="text-foreground text-center">{transcript}</P>
        </View>
      ) : null}

      <Button variant="ghost" className="mt-6" onPress={() => router.back()}>
        <P className="text-muted-foreground">Cancel</P>
      </Button>
    </View>
  );
}
