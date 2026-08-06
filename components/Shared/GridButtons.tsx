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
    <View className="flex-row flex-wrap mt-2 -mx-1">
      {buttons.map((item, index) => (
        <View key={`group-button-${index}`} className="basis-1/3 p-1">
          <SharedGroupButton
            item={item}
            selected={value.includes(item.value)}
            onPress={() => onValueChange(item.value)}
            className={cn(
              "w-full h-full rounded-2xl border-continuous py-3 items-center justify-center gap-2 border-2",
              value.includes(item.value) ? "border-muted-foreground/40" : "border-transparent"
            )}
          />
        </View>
      ))}
    </View>
  );
}
