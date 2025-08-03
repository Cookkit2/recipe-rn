import React, { type JSX } from "react";
import { View, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { Button } from "./ui/button";
import useItemTypeStore from "~/store/type-store";
import type { ItemType } from "~/types/PantryItem";
import {
  AppleIcon,
  RefrigeratorIcon,
  SnowflakeIcon,
  CabinetIcon,
} from "~/lib/icons/PantryIcons";
import { P } from "./ui/typography";
import { cn } from "~/lib/utils";

const TYPES: Array<{ type: ItemType; label: string; icon: JSX.Element }> = [
  {
    type: "all",
    label: "All",
    icon: <AppleIcon className="text-foreground" size={16} />,
  },
  {
    type: "fridge",
    label: "Fridge",
    icon: <RefrigeratorIcon className="text-foreground" size={16} />,
  },
  {
    type: "cabinet",
    label: "Cabinet",
    icon: <CabinetIcon className="text-foreground" size={16} />,
  },
  {
    type: "freezer",
    label: "Freezer",
    icon: <SnowflakeIcon className="text-foreground" size={16} />,
  },
];

// Individual animated button component
function AnimatedToggleButton({
  type,
  label,
  icon,
  isSelected,
  onPress,
}: {
  type: ItemType;
  label: string;
  icon: JSX.Element;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSequence(
      withSpring(1.05, {
        damping: 15,
        stiffness: 300,
      }),
      withSpring(1, {
        damping: 15,
        stiffness: 300,
      })
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <View
          className={cn(
            "flex-row items-center gap-1 rounded-full px-4 py-2",
            isSelected ? "bg-primary" : "bg-background border border-border"
          )}
        >
          {React.cloneElement(icon, {
            className: cn(
              isSelected ? "text-primary-foreground" : "text-foreground"
            ),
          })}
          <P
            className={cn(
              "text-sm font-medium",
              isSelected ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {label}
          </P>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ToggleButtonGroup() {
  const { selectedItemType, changeItemType } = useItemTypeStore();

  return (
    <View className="flex flex-row gap-x-2 px-4 overflow-x-auto">
      {TYPES.map(({ type, label, icon }) => {
        const isSelected = selectedItemType === type;
        return (
          <AnimatedToggleButton
            key={type}
            type={type}
            label={label}
            icon={icon}
            isSelected={isSelected}
            onPress={() => changeItemType(type)}
          />
        );
      })}
    </View>
  );
}
