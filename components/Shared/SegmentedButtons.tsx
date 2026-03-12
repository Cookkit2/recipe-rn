import React, { useMemo, type JSX } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import useSelectionRing from "~/hooks/animation/useSelectionRing";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

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
          <GroupButton
            key={index}
            item={item}
            className={getSegmentedButtonWidthClassName(buttons.length, columns)}
            onLayout={onItemLayout(index)}
            selected={value === item.value}
            onPress={() => onValueChange(item.value)}
          />
        ))}
      </View>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function GroupButton<T>({
  className,
  item,
  onLayout,
  selected,
  onPress,
}: {
  className?: string;
  item: GroupButton<T>;
  onLayout?: (e: LayoutChangeEvent) => void;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } = useButtonAnimation(true);

  return (
    <AnimatedPressable
      onLayout={onLayout}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={cn(
        "w-full rounded-2xl border-continuous p-2 py-4 items-center justify-center gap-2",
        className
      )}
      style={[animatedStyle, roundedStyle]}
      onPress={onPress}
    >
      {React.cloneElement(item.icon, {
        className: cn(
          item.icon.props?.className,
          selected ? "text-foreground" : "text-muted-foreground"
        ),
      })}
      <P
        className={cn(
          selected
            ? "font-urbanist-medium text-foreground"
            : "font-urbanist-regular text-muted-foreground"
        )}
      >
        {item.label}
      </P>
    </AnimatedPressable>
  );
}
