import React, { useCallback, useState } from "react";
import { View } from "react-native";
import SegmentedButtons, { type GroupButton } from "../Shared/SegmentedButtons";
import { Card, CardContent } from "../ui/card";
import { H4, P } from "../ui/typography";

type UnitSystem = "si" | "imperial";

export default function UnitSection() {
  const [unit, setUnit] = useState<UnitSystem>("si");
  const handleSelectUnit = useCallback((value: UnitSystem) => {
    setUnit(value);
  }, []);

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <View className="gap-1">
          <H4 className="font-urbanist-bold">Units</H4>
          <P className="font-urbanist-regular text-muted-foreground">
            Choose your preferred measurement system
          </P>
        </View>
        <SegmentedButtons
          buttons={UNIT_BUTTONS}
          value={unit}
          onValueChange={handleSelectUnit}
        />
      </CardContent>
    </Card>
  );
}

const UNIT_BUTTONS: GroupButton<UnitSystem>[] = [
  { label: "SI", icon: <P className="font-bowlby-one">kg</P>, value: "si" },
  {
    label: "Imperial",
    icon: <P className="font-bowlby-one">lbs</P>,
    value: "imperial",
  },
] as const;
