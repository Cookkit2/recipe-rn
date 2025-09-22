import React, { useMemo, type JSX } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import useSelectionRing from "~/hooks/animation/useSelectionRing";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/tw-merge";

export type GroupButton<T> = {
  label: string;
  icon: JSX.Element;
  value: T;
};

type SegmentedButtonsProps<T> = {
  buttons: GroupButton<T>[];
  value: T | undefined;
  onValueChange: (scheme: T) => void;
};

export default function SegmentedButtons<T>({
  buttons,
  value,
  onValueChange,
}: SegmentedButtonsProps<T>) {
  const selectedIndex = useMemo(
    () => buttons.findIndex((b) => b.value === value),
    [buttons, value]
  );
  const { onItemLayout, ringStyle } = useSelectionRing(selectedIndex);
  const twoOnly = useMemo(() => buttons.length === 2, [buttons.length]);

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
            className={twoOnly ? "basis-1/2 px-1.5" : "basis-1/3 px-1.5"}
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
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
    useButtonAnimation(true);

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
