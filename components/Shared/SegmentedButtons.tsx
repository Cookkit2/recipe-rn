import React, { useMemo, type JSX } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import useSelectionRing from "~/hooks/animation/useSelectionRing";
import { cn } from "~/lib/utils";
import { SharedGroupButton } from "./SharedGroupButton";

const COLUMN_CLASS_MAP = {
  1: "basis-full",
  2: "basis-1/2",
  3: "basis-1/3",
  4: "basis-1/4",
} as const;

function getSegmentedButtonWidthClassName(buttonCount: number, columns: number): string {
  const resolvedColumns = buttonCount === 2 ? 2 : columns;
  const basisClass =
    COLUMN_CLASS_MAP[resolvedColumns as keyof typeof COLUMN_CLASS_MAP] ?? "basis-1/3";

  return `${basisClass} px-1.5`;
}

export type GroupButton<T> = {
  label: string;
  icon: JSX.Element;
  value: T;
};

type SegmentedButtonsProps<T> = {
  buttons: GroupButton<T>[];
  value: T | undefined;
  onValueChange: (scheme: T) => void;
  columns?: number;
};

export default function SegmentedButtons<T>({
  buttons,
  value,
  onValueChange,
  columns = 3,
}: SegmentedButtonsProps<T>) {
  const selectedIndex = useMemo(
    () => buttons.findIndex((b) => b.value === value),
    [buttons, value]
  );
  const { onItemLayout, ringStyle } = useSelectionRing(selectedIndex);

  return (
    <View className="relative mt-2">
      {/* Animated selection border */}
      {value && (
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-2xl border-2 border-muted-foreground/40"
          style={ringStyle}
        />
      )}

      <View className={"flex-row flex-wrap items-stretch gap-y-3"}>
        {buttons.map((item, index) => (
          <SharedGroupButton
            key={index}
            item={item}
            className={getSegmentedButtonWidthClassName(buttons.length, columns)}
            onLayout={onItemLayout(index) as (e: LayoutChangeEvent) => void}
            selected={value === item.value}
            onPress={() => onValueChange(item.value)}
          />
        ))}
      </View>
    </View>
  );
}
