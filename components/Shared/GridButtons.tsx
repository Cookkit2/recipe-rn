import React, { useCallback } from "react";
import { FlatList, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { cn } from "~/lib/utils";
import type { GroupButton } from "./SegmentedButtons";
import { SharedGroupButton } from "./SharedGroupButton";

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
      <SharedGroupButton
        item={item}
        selected={value.includes(item.value)}
        onPress={() => onValueChange(item.value)}
        className={cn(
          "flex-1 rounded-2xl border-continuous p-1 m-1 py-3 items-center justify-center gap-2 border-2",
          value.includes(item.value) ? "border-muted-foreground/40" : "border-transparent"
        )}
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
