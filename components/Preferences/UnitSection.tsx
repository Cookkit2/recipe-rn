import React, { useCallback, useState } from "react";
import { View } from "react-native";
import SegmentedButtons, { type GroupButton } from "~/components/Shared/SegmentedButtons";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P } from "~/components/ui/typography";
import { database, storage } from "~/data";
import { PREF_UNIT_SYSTEM_KEY } from "~/constants/storage-keys";
import { toast } from "sonner-native";
import { useRefreshPantryItems } from "~/hooks/queries/usePantryQueries";
import { useRefreshRecipes } from "~/hooks/queries/useRecipeQueries";
import { log } from "~/utils/logger";

type UnitSystem = "metric" | "imperial";

export default function UnitSection() {
  // Handle legacy "si" value - treat as "metric"
  const storedValue = storage.get(PREF_UNIT_SYSTEM_KEY) as string | undefined;
  const [unit, setUnit] = useState<UnitSystem>(storedValue === "imperial" ? "imperial" : "metric");
  // const [isLoading, setIsLoading] = useState(false);
  const { refresh: refreshPantry } = useRefreshPantryItems();
  const { refresh: refreshRecipe } = useRefreshRecipes();

  const handleSelectUnit = useCallback(
    async (value: UnitSystem) => {
      // setIsLoading(true);
      const previousUnit = unit;
      try {
        setUnit(value);
        storage.set(PREF_UNIT_SYSTEM_KEY, value);
        await database.convertUnits(value);
        refreshPantry();
        refreshRecipe();
      } catch (error) {
        log.error("Error converting units:", error);
        toast.error("Failed to convert units");
        setUnit(previousUnit);
        storage.set(PREF_UNIT_SYSTEM_KEY, previousUnit);
      } finally {
        // setIsLoading(false);
      }
    },
    [refreshPantry, refreshRecipe, unit]
  );

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <View className="gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <H4 className="font-urbanist-bold">Units</H4>
            {/* {isLoading && (
              <TextShimmer>
                <P className="text-sm text-muted-foreground">Converting...</P>
              </TextShimmer>
            )} */}
          </View>
          <P className="font-urbanist-regular text-muted-foreground">
            Choose your preferred measurement system
          </P>
        </View>
        <SegmentedButtons buttons={UNIT_BUTTONS} value={unit} onValueChange={handleSelectUnit} />
      </CardContent>
    </Card>
  );
}

const UNIT_BUTTONS: GroupButton<UnitSystem>[] = [
  { label: "Metric", icon: <P className="font-bowlby-one">kg</P>, value: "metric" },
  {
    label: "Imperial",
    icon: <P className="font-bowlby-one">lbs</P>,
    value: "imperial",
  },
] as const;
