import React from "react";
import { Modal, Platform, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useUniwind } from "uniwind";

export default function BaseModal({
  modalVisible,
  onCancel,
  children,
}: {
  modalVisible: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useUniwind();

  return (
    <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={onCancel}>
      <BlurView intensity={20} className="absolute inset-0 z-[1]" tint={theme} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 z-[2]"
      >
        <Pressable
          className="flex-1 justify-center items-center bg-black/50 px-4 z-[2]"
          onPress={onCancel}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm flex items-center"
          >
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
