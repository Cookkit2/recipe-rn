import React, { useCallback } from "react";
import { FlatList, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { cn } from "~/lib/tw-merge";
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
  const renderItem = useCallback(
    ({ item }: { item: GroupButton<T> }) => (
      <GroupButton
        item={item}
        selected={value.includes(item.value)}
        onPress={() => onValueChange(item.value)}
      />
    ),
    [value, onValueChange]
  );

  const keyExtractor = useCallback(
    (item: GroupButton<T>, index: number) => `group-button-${index}`,
    []
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<GroupButton<T>> | null | undefined, index: number) => {
      const itemHeight = 80; // Approximate height per item
      const numColumns = 3;
      const row = Math.floor(index / numColumns);

      return {
        length: itemHeight,
        offset: row * itemHeight,
        index,
      };
    },
    []
  );

  return (
    <FlatList
      numColumns={3}
      scrollEnabled={false}
      className="mt-2"
      data={buttons}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={6}
      initialNumToRender={6}
      windowSize={3}
    />
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
});
