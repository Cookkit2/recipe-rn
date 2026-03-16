import React, { useState } from "react";
import { View, TextInput, Pressable } from "react-native";
import { Text } from "~/components/ui/text";
import { cn } from "~/lib/utils";
import { EyeIcon, EyeOffIcon } from "lucide-uniwind";

interface AuthInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?:
    | "email"
    | "password"
    | "password-new"
    | "current-password"
    | "username"
    | "off";
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete,
  error,
  className,
  disabled = false,
}: AuthInputProps) {
  const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const showPasswordToggle = secureTextEntry;
  const actuallySecure = secureTextEntry && !isSecureTextVisible;

  return (
    <View className={cn("space-y-2", className)}>
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={actuallySecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            "h-12 px-4 py-3 rounded-lg border text-base text-foreground bg-background",
            "placeholder:text-muted-foreground",
            isFocused && "border-primary",
            error && "border-destructive",
            disabled && "opacity-50",
            !isFocused && !error && "border-border"
          )}
          placeholderTextColor="#6b7280"
        />
        {showPasswordToggle && (
          <Pressable
            onPress={() => setIsSecureTextVisible(!isSecureTextVisible)}
            className="absolute right-3 top-3 p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isSecureTextVisible ? (
              <EyeOffIcon size={20} className="text-muted-foreground" />
            ) : (
              <EyeIcon size={20} className="text-muted-foreground" />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-sm text-destructive font-medium">{error}</Text>
      )}
    </View>
  );
}
