import React, { type JSX } from "react";
import { View } from "react-native";
import { Button } from "../ui/button";
import useItemTypeStore from "~/store/type-store";
import type { ItemType } from "~/types/PantryItem";
import {
  AppleIcon,
  RefrigeratorIcon,
  SnowflakeIcon,
  CabinetIcon,
} from "~/lib/icons/PantryIcons";
import { P } from "../ui/typography";
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

export default function ToggleButtonGroup() {
  const { selectedItemType, changeItemType } = useItemTypeStore();

  return (
    <View className="flex flex-row gap-x-2 px-4 overflow-x-auto">
      {TYPES.map(({ type, label, icon }) => {
        const isSelected = selectedItemType === type;
        return (
          <Button
            key={type}
            size="sm"
            className={cn(
              "flex-row items-center gap-1 rounded-full",
              isSelected ? "bg-primary" : "bg-background border border-border"
            )}
            onPress={() => changeItemType(type)}
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
          </Button>
        );
      })}
    </View>
  );
}
