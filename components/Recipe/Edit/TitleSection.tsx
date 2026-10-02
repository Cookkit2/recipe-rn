import React from "react";
import { View, TextInput } from "react-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { HistoryIcon } from "lucide-uniwind";

type TitleSectionProps = {
  title: string;
  onChangeText: (newTitle: string) => void;
  onShowVersionHistory: () => void;
  titleInputRef?: React.RefObject<TextInput | null>;
};

export function TitleSection({
  title,
  onChangeText,
  onShowVersionHistory,
  titleInputRef,
}: TitleSectionProps) {
  return (
    <View className="gap-2 px-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 relative">
          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={onChangeText}
            placeholder="Recipe Title"
            multiline
            scrollEnabled={false}
            textAlignVertical="center"
            returnKeyType="done"
            underlineColorAndroid="transparent"
            className="text-3xl text-foreground font-bowlby-one bg-transparent pr-20"
            style={{
              paddingVertical: 0,
              includeFontPadding: false,
            }}
          />
        </View>
        <Button
          size="sm"
          variant="secondary"
          onPress={onShowVersionHistory}
          className="rounded-full mb-1"
        >
          <View className="flex-row items-center gap-1.5">
            <HistoryIcon size={14} strokeWidth={2.5} />
            <Text className="text-sm">History</Text>
          </View>
        </Button>
      </View>
    </View>
  );
}
