import React from "react";
import { FlatList, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { cn } from "~/lib/tw-merge";
import { P } from "../ui/typography";
import type { GroupButton } from "./SegmentedButtons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    <FlatList
      numColumns={3}
      scrollEnabled={false}
      className="mt-2"
      data={buttons}
      renderItem={({ item, index }) => (
        <GroupButton
          key={index}
          item={item}
          selected={value.includes(item.value)}
          onPress={() => onValueChange(item.value)}
        />
      )}
    />
  );
}

function GroupButton<T>({
  item,
  selected,
  onPress,
}: {
  item: GroupButton<T>;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } =
    useButtonAnimation(true);

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={cn(
        "flex-1 rounded-2xl border-continuous p-1 m-1 py-3 items-center justify-center gap-2 border-2",
        selected ? "border-muted-foreground/40" : "border-transparent"
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
