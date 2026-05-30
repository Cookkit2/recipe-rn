import React, { useMemo } from "react";
import { View, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { cn } from "~/lib/utils";
import { P } from "~/components/ui/typography";
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
  // O(1) lookup set to prevent O(N) .includes() search per item on every render
  const valueSet = useMemo(() => new Set(value), [value]);

  return (
    <View className="mt-2 flex-row flex-wrap">
      {buttons.map((item, index) => (
        <View key={`group-button-${index}`} style={{ width: "33.333%" }}>
          <GroupButton
            item={item}
            selected={valueSet.has(item.value)}
            onPress={() => onValueChange(item.value)}
          />
        </View>
      ))}
    </View>
  );
}

const GroupButton = React.memo(function GroupButton<T>({
  item,
  selected,
  onPress,
}: {
  item: GroupButton<T>;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } = useButtonAnimation(true);

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
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: !!selected }}
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
});
