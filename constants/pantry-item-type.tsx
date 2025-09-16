import CabinetIcon from "~/lib/icons/CabinetIcon";
import type { ItemType } from "~/types/PantryItem";
import { AppleIcon, RefrigeratorIcon, SnowflakeIcon } from "lucide-nativewind";
import type { JSX } from "react";

export const PANTRY_ITEM_TYPE_OPTIONS: Array<{
  type: Exclude<ItemType, "all">;
  label: string;
  icon: JSX.Element;
}> = [
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
] as const;

export const PANTRY_ITEM_TYPES: Array<{
  type: ItemType;
  label: string;
  icon: JSX.Element;
}> = [
  {
    type: "all",
    label: "All",
    icon: (
      <AppleIcon className="text-foreground" size={16} strokeWidth={2.618} />
    ),
  },
  ...PANTRY_ITEM_TYPE_OPTIONS,
] as const;
