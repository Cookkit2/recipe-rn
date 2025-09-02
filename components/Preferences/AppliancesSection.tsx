import React, { useCallback, useState } from "react";
import { View } from "react-native";
import GridButtons from "../Shared/GridButtons";
import { Card, CardContent } from "../ui/card";
import { H4, P } from "../ui/typography";
import type { GroupButton } from "../Shared/SegmentedButtons";
import {
  CookingPotIcon,
  PlugIcon,
  MicrowaveIcon,
  WheatIcon,
  AirVentIcon,
  FanIcon,
} from "lucide-nativewind";
import { toggleFromArray } from "~/utils/array-helper";

type Appliance =
  | "stovetop"
  | "electric-pot"
  | "oven"
  | "rice-cooker"
  | "air-fryer"
  | "blender";

export default function AppliancesSection() {
  // Appliances
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const handleToggleAppliance = useCallback((appliance: Appliance) => {
    setAppliances((prev) => toggleFromArray(prev, appliance));
  }, []);

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <View className="gap-1">
          <H4 className="font-urbanist-bold">Cooking Appliances</H4>
          <P className="font-urbanist-regular text-muted-foreground">
            Select all that apply
          </P>
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
    icon: <AirVentIcon className="rotate-180" />,
    value: "air-fryer",
  },
  {
    label: "Blender",
    icon: <FanIcon />,
    value: "blender",
  },
];
