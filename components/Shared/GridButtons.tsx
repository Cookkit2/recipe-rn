import React from "react";
import { View } from "react-native";
import { cn } from "~/lib/utils";
import type { GroupButton } from "./SegmentedButtons";
import { SharedGroupButton } from "./SharedGroupButton";

type SegmentedButtonsProps<T> = {
  buttons: GroupButton<T>[];
  value: T[];
  onValueChange: (scheme: T) => void;
};

export default function GridButtons<T>({
  buttons,
  value,
  onValueChange,
}: SegmentedButtonsProps<T>) {
  return (
    <View className="flex-row flex-wrap mt-2">
      {buttons.map((item, index) => (
        <View key={`group-button-${index}`} className="w-1/3">
          <SharedGroupButton
            item={item}
            selected={value.includes(item.value)}
            onPress={() => onValueChange(item.value)}
            className={cn(
              "rounded-2xl border-continuous p-1 m-1 py-3 items-center justify-center gap-2 border-2",
              value.includes(item.value) ? "border-muted-foreground/40" : "border-transparent"
            )}
          />
        </View>
      ))}
    </View>
  );
}
