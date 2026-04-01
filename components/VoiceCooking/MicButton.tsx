/**
 * Mic Button Component
 *
 * Unified voice control button for both speech recognition and TTS.
 * Shows combined state with visual feedback.
 */

import React from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useSharedValue,
} from "react-native-reanimated";
import { cn } from "~/lib/utils";
import { MicIcon, MicOffIcon, Volume2Icon } from "lucide-uniwind";
import * as Haptics from "expo-haptics";
import useOnPressScale from "~/hooks/animation/useOnPressScale";
import { useEffect } from "react";

interface MicButtonProps {
  isListening: boolean;
  onToggle: () => void;
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  isSpeaking?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-14 h-14",
};

const iconSizes = {
  sm: 18,
  md: 22,
  lg: 26,
};

export function MicButton({
  isListening,
  onToggle,
  voiceEnabled,
  onToggleVoice,
  isSpeaking,
  className,
  size = "md",
}: MicButtonProps) {
  const { animatedStyle: pressStyle, handlePressIn, handlePressOut } = useOnPressScale();
  const pulseScale = useSharedValue(1);

  // Combined state: any voice feature is active
  const isAnyVoiceActive = isListening || isSpeaking || false;
  // Voice features are enabled (either listening or TTS)
  const isVoiceEnabled = voiceEnabled || isListening;

  // Determine current icon type
  const iconType = isSpeaking ? "speaking" : isListening || isVoiceEnabled ? "enabled" : "off";

  // Pulse animation when any voice feature is active
  useEffect(() => {
    if (isAnyVoiceActive) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [isAnyVoiceActive, pulseScale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If voice is enabled (either listening or TTS), turn off both
    // If voice is disabled, turn on both
    if (isVoiceEnabled) {
      // Turn off both
      if (isListening) {
        onToggle(); // Stop listening
      }
      if (voiceEnabled && onToggleVoice) {
        onToggleVoice(); // Disable TTS
      }
    } else {
      // Turn on both
      if (!isListening) {
        onToggle(); // Start listening
      }
      if (!voiceEnabled && onToggleVoice) {
        onToggleVoice(); // Enable TTS
      }
    }
  };

  // Determine button color
  const buttonColor = isAnyVoiceActive ? "bg-primary" : "bg-muted";

  // Icon helper function
  const getIcon = (type: string) => {
    switch (type) {
      case "speaking":
        return <Volume2Icon size={iconSizes[size]} className="text-primary-foreground" />;
      case "enabled":
        return <MicIcon size={iconSizes[size]} className="text-primary-foreground" />;
      case "off":
      default:
        return <MicOffIcon size={iconSizes[size]} className="text-muted-foreground" />;
    }
  };

  // Determine accessibility label
  const accessibilityLabel = isAnyVoiceActive ? "Mute voice assistant" : "Unmute voice assistant";

  return (
    <Animated.View style={[pressStyle, pulseAnimatedStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected: isVoiceEnabled }}
        className={cn(
          "rounded-full items-center justify-center shadow-lg",
          buttonColor,
          sizeClasses[size],
          className
        )}
      >
        {getIcon(iconType)}
      </Pressable>
    </Animated.View>
  );
}
