import React from "react";
import { Modal, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useColorScheme } from "~/hooks/useColorScheme";

export default function BaseModal({
  modalVisible,
  onCancel,
  children,
}: {
  modalVisible: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onCancel}
    >
      <BlurView
        intensity={20}
        className="absolute inset-0 z-[1]"
        tint={isDarkColorScheme ? "dark" : "light"}
      />
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
    </Modal>
  );
}
