/**
 * Shared GroupButton component.
 *
 * Extracts the duplicated button rendering from GridButtons and SegmentedButtons.
 * Both components render the same animated pressable with icon + label pattern.
 */

import React from "react";
import { Pressable, type LayoutChangeEvent } from "react-native";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";
import type { GroupButton } from "./SegmentedButtons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SharedGroupButtonProps<T> {
  className?: string;
  item: GroupButton<T>;
  onLayout?: (e: LayoutChangeEvent) => void;
  selected?: boolean;
  onPress?: () => void;
}

/**
 * Generic animated button with icon + label, shared between GridButtons and SegmentedButtons.
 */
export const SharedGroupButton = React.memo(function SharedGroupButton<T>({
  className,
  item,
  onLayout,
  selected,
  onPress,
}: SharedGroupButtonProps<T>) {
  const { animatedStyle, roundedStyle, onPressIn, onPressOut } = useButtonAnimation(true);

  return (
    <AnimatedPressable
      onLayout={onLayout}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={cn(
        "rounded-2xl border-continuous p-2 py-4 items-center justify-center gap-2",
        className
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
}) as <T>(props: SharedGroupButtonProps<T>) => React.ReactElement | null;
