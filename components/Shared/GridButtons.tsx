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
  // Optimization: FlatList with scrollEnabled={false} for a small, static grid
  // is an anti-pattern. We use View with flex-row flex-wrap instead.
  return (
    <View className="mt-2 flex-row flex-wrap">
      {buttons.map((item, index) => (
        <SharedGroupButton
          key={`group-button-${index}`}
          item={item}
          selected={value.includes(item.value)}
          onPress={() => onValueChange(item.value)}
          className={cn(
            "basis-[31%] rounded-2xl border-continuous p-1 m-1 py-3 items-center justify-center gap-2 border-2",
            value.includes(item.value) ? "border-muted-foreground/40" : "border-transparent"
          )}
        />
      ))}
    </View>
  );
}
