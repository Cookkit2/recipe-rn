import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "~/components/ui/text";
import { cn } from "~/lib/utils";
import Animated from "react-native-reanimated";
import useOnPressScale from "~/hooks/animation/useOnPressScale";

interface SocialAuthButtonProps {
  provider: "google" | "apple" | "facebook";
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const providerConfig = {
  google: {
    label: "Continue with Google",
    bgColor: "bg-white",
    textColor: "text-gray-900",
    borderColor: "border-gray-300",
    icon: "G", // You can replace with actual icon component
  },
  apple: {
    label: "Continue with Apple",
    bgColor: "bg-black",
    textColor: "text-white",
    borderColor: "border-black",
    icon: "", // Apple icon
  },
  facebook: {
    label: "Continue with Facebook",
    bgColor: "bg-blue-600",
    textColor: "text-white",
    borderColor: "border-blue-600",
    icon: "f", // Facebook icon
  },
};

export function SocialAuthButton({
  provider,
  onPress,
  disabled = false,
  loading = false,
  className,
}: SocialAuthButtonProps) {
  const { animatedStyle, handlePressIn, handlePressOut } = useOnPressScale();
  const config = providerConfig[provider];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        className={cn(
          "flex-row items-center justify-center h-12 px-4 py-3 rounded-lg border",
          config.bgColor,
          config.borderColor,
          disabled && "opacity-50",
          className
        )}
      >
        <View className="flex-row items-center space-x-3">
          <View className="w-5 h-5 items-center justify-center">
            <Text className={cn("font-bold text-lg", config.textColor)}>{config.icon}</Text>
          </View>
          <Text className={cn("font-medium", config.textColor)}>
            {loading ? "Connecting..." : config.label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
