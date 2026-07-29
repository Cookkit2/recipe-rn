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
  // ⚡ Bolt Optimization:
  // Replaced unscrollable FlatList with mapped View to eliminate virtualization
  // overhead (subview clipping, layout mapping). This reduces memory allocations
  // and speeds up rendering for this static component.
  return (
    <View className="mt-2 flex-row flex-wrap">
      {buttons.map((item, index) => (
        <View key={`group-button-${index}`} className="w-1/3">
          <SharedGroupButton
            item={item}
            selected={value.includes(item.value)}
            onPress={() => onValueChange(item.value)}
            className={cn(
              "flex-1 rounded-2xl border-continuous p-1 m-1 py-3 items-center justify-center gap-2 border-2",
              value.includes(item.value) ? "border-muted-foreground/40" : "border-transparent"
            )}
          />
        </View>
      ))}
    </View>
  );
}
