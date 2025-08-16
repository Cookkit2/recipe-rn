import React, { type JSX } from "react";
import { Button } from "../ui/button";
import useItemTypeStore from "~/store/type-store";
import type { ItemType } from "~/types/PantryItem";
import { AppleIcon, RefrigeratorIcon, SnowflakeIcon } from "lucide-nativewind";
import { CabinetIcon } from "~/lib/icons/Cabinet";
import { P } from "../ui/typography";
import { cn } from "~/lib/tw-merge";
import Animated, {
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";

const TYPES: Array<{ type: ItemType; label: string; icon: JSX.Element }> = [
  {
    type: "all",
    label: "All",
    icon: (
      <AppleIcon className="text-foreground" size={16} strokeWidth={2.618} />
    ),
  },
  {
    type: "fridge",
    label: "Fridge",
    icon: (
      <RefrigeratorIcon
        className="text-foreground"
        size={16}
        strokeWidth={2.618}
      />
    ),
  },
  {
    type: "cabinet",
    label: "Cabinet",
    icon: (
      <CabinetIcon className="text-foreground" size={16} strokeWidth={2.618} />
    ),
  },
  {
    type: "freezer",
    label: "Freezer",
    icon: (
      <SnowflakeIcon
        className="text-foreground"
        size={16}
        strokeWidth={2.618}
      />
    ),
  },
];

export default function ToggleButtonGroup({
  scrollY,
}: {
  scrollY: SharedValue<number>;
}) {
  const { selectedItemType, changeItemType } = useItemTypeStore();

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const isVisible = scrollY.value > 20;
    const borderWidth = withTiming(
      isVisible ? 1 : 0,
      CURVES["expressive.fast.effects"]
    );
    return { borderBottomWidth: borderWidth };
  });

  return (
    <Animated.View
      className="flex flex-row gap-x-2 px-4 overflow-x-auto pb-3 border-border"
      style={[borderAnimatedStyle]}
    >
      {TYPES.map(({ type, label, icon }) => {
        const isSelected = selectedItemType === type;
        return (
          <Button
            key={type}
            size="sm"
            className={cn(
              "flex-row items-center gap-1 rounded-full border-continuous",
              isSelected
                ? "bg-foreground/80"
                : "bg-background border border-border"
            )}
            onPress={() => changeItemType(type)}
          >
            {React.cloneElement(icon, {
              className: cn(isSelected ? "text-background" : "text-foreground"),
            })}
            <P
              className={cn(
                "text-sm font-urbanist-medium tracking-wider",
                isSelected ? "text-background" : "text-foreground"
              )}
            >
              {label}
            </P>
          </Button>
        );
      })}
    </Animated.View>
  );
}
