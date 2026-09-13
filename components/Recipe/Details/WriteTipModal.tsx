import React, { useState, useEffect } from "react";
import { View, TextInput, ActivityIndicator, Alert } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import BaseModal from "~/components/ui/modal";
import type { TipWithAuthor, CreateTipInput } from "~/types/Review";

interface WriteTipModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTipInput) => void;
  existingTip?: TipWithAuthor | null;
  isSubmitting: boolean;
}

const MAX_LENGTH = 300;

export default function WriteTipModal({
  visible,
  onClose,
  onSubmit,
  existingTip,
  isSubmitting,
}: WriteTipModalProps) {
  const [body, setBody] = useState("");

  useEffect(() => {
    if (visible) {
      setBody(existingTip?.body ?? "");
    }
  }, [visible, existingTip]);

  const handleSubmit = () => {
    if (body.trim().length === 0) {
      Alert.alert("Tip required", "Please write your tip or modification.");
      return;
    }
    onSubmit({ body: body.trim() });
  };

  const handleClose = () => {
    setBody("");
    onClose();
  };

  const isEditing = !!existingTip;

  return (
    <BaseModal modalVisible={visible} onCancel={handleClose}>
      <View className="bg-background rounded-4xl p-6 w-full shadow-xl border-continuous">
        <H4 className="font-urbanist-bold text-foreground text-center mb-2">
          {isEditing ? "Edit Tip" : "Add a Tip"}
        </H4>
        <P className="text-sm font-urbanist-regular text-muted-foreground text-center mb-6">
          Share a modification or cooking tip
        </P>

        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-1">
            <P className="text-sm font-urbanist-medium text-foreground">Your tip</P>
            <Small className="text-muted-foreground">
              {body.length}/{MAX_LENGTH}
            </Small>
          </View>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="e.g., I substituted coconut milk and it turned out great!"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={MAX_LENGTH}
            className="w-full min-h-[80px] rounded-lg bg-muted px-3 py-2 text-base font-urbanist-regular border-continuous"
            editable={!isSubmitting}
          />
        </View>

        <View className="flex-row gap-3 mt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-2xl"
            onPress={handleClose}
            disabled={isSubmitting}
          >
            <P className="font-urbanist-semibold text-foreground">Cancel</P>
          </Button>
          <Button
            className="flex-1 rounded-2xl bg-foreground flex-row justify-center items-center gap-2"
            onPress={handleSubmit}
            disabled={isSubmitting || body.trim().length === 0}
          >
            {isSubmitting && <ActivityIndicator size="small" color="white" />}
            <P className="font-urbanist-semibold text-background">
              {isEditing ? "Update" : "Submit"}
            </P>
          </Button>
        </View>
      </View>
    </BaseModal>
  );
}
