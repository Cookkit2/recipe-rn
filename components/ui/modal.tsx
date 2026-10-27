import React from "react";
import { Modal, Platform, Pressable } from "react-native";
import { BlurView, type BlurViewProps } from "expo-blur";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useUniwind } from "uniwind";

export default function BaseModal({
  modalVisible,
  onCancel,
  children,
  blurTarget,
  blurTint,
}: {
  modalVisible: boolean;
  onCancel: () => void;
  children: React.ReactNode;
  blurTarget?: BlurViewProps["blurTarget"];
  blurTint?: BlurViewProps["tint"];
}) {
  const { theme } = useUniwind();

  return (
    <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={onCancel}>
      <BlurView
        intensity={20}
        className="absolute inset-0 z-[1]"
        tint={blurTint ?? (theme === "dark" ? "dark" : "light")}
        blurTarget={blurTarget}
        blurMethod={blurTarget ? "dimezisBlurView" : undefined}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 z-[2]"
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50 px-4 z-[2]"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal"
          accessibilityHint="Closes the currently active modal"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm flex items-center"
            importantForAccessibility="no"
          >
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
