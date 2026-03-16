import React, { useCallback } from "react";
import { View } from "react-native";
import GridButtons from "~/components/Shared/GridButtons";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P } from "~/components/ui/typography";
import type { GroupButton } from "~/components/Shared/SegmentedButtons";
import {
  CookingPotIcon,
  PlugIcon,
  MicrowaveIcon,
  WheatIcon,
  FlameIcon,
  FanIcon,
} from "lucide-uniwind";
import { toggleFromArray } from "~/utils/array-helper";
import { PREF_APPLIANCES_KEY } from "~/constants/storage-keys";
import useLocalStorageState from "~/hooks/useLocalStorageState";

type Appliance = "stovetop" | "electric-pot" | "oven" | "rice-cooker" | "air-fryer" | "blender";

const APPLIANCE_OPTIONS: GroupButton<Appliance>[] = [
  {
    label: "Stovetop",
    icon: <CookingPotIcon />,
    value: "stovetop",
  },
  {
    label: "Electric Pot",
    icon: <PlugIcon />,
    value: "electric-pot",
  },
  {
    label: "Oven",
    icon: <MicrowaveIcon />,
    value: "oven",
  },
  {
    label: "Rice cooker",
    icon: <WheatIcon />,
    value: "rice-cooker",
  },
  {
    label: "Air fryer",
    icon: <FlameIcon />,
    value: "air-fryer",
  },
  {
    label: "Blender",
    icon: <FanIcon />,
    value: "blender",
  },
];

export default function AppliancesSection() {
  const [appliances = [], setAppliances] = useLocalStorageState<Appliance[]>(PREF_APPLIANCES_KEY, {
    defaultValue: [],
    serializer: {
      parse: (value: string) => {
        if (!value) return [];
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed as Appliance[];
          return []; // Ignore if not array
        } catch {
          return value.split(",") as Appliance[];
        }
      },
      stringify: (value: unknown) => JSON.stringify(value),
    },
  });

  const handleToggleAppliance = useCallback(
    (appliance: Appliance) => {
      setAppliances((prev = []) => {
        return toggleFromArray(prev, appliance);
      });
    },
    [setAppliances]
  );

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <View className="gap-1">
          <H4 className="font-urbanist-bold">Cooking Appliances</H4>
          <P className="font-urbanist-regular text-muted-foreground">Select all that apply</P>
        </View>
        <GridButtons
          buttons={APPLIANCE_OPTIONS}
          value={appliances}
          onValueChange={handleToggleAppliance}
        />
      </CardContent>
    </Card>
  );
}
