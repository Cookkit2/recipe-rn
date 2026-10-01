import React from "react";
import { View, TextInput } from "react-native";
import { H4 } from "~/components/ui/typography";

type DescriptionSectionProps = {
  description: string;
  onChangeText: (newDescription: string) => void;
  descriptionInputRef?: React.RefObject<TextInput>;
};

export function DescriptionSection({
  description,
  onChangeText,
  descriptionInputRef,
}: DescriptionSectionProps) {
  return (
    <View className="gap-2 px-4">
      <H4>Description</H4>
      <View className="relative bg-muted rounded-xl px-4 py-3">
        <TextInput
          ref={descriptionInputRef}
          value={description}
          onChangeText={onChangeText}
          placeholder="Add a description for your recipe..."
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          returnKeyType="done"
          underlineColorAndroid="transparent"
          className="flex-1 text-base text-foreground font-urbanist-regular bg-transparent leading-relaxed"
          style={{
            paddingVertical: 0,
            includeFontPadding: false,
            minHeight: 80,
          }}
        />
      </View>
    </View>
  );
}
