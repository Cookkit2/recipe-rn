import { useCallback, useState } from "react";
import { View, TextInput, Platform } from "react-native";
import GridButtons from "~/components/Shared/GridButtons";
import { Card, CardContent } from "~/components/ui/card";
import { H4, P } from "~/components/ui/typography";
import {
  MilkIcon,
  EggIcon,
  NutIcon,
  FishIcon,
  ShrimpIcon,
  WheatIcon,
} from "lucide-uniwind";
import { toggleFromArray } from "~/utils/array-helper";
import type { GroupButton } from "~/components/Shared/SegmentedButtons";
import { storage } from "~/data";
import {
  PREF_ALLERGENS_KEY,
  PREF_OTHER_ALLERGENS_KEY,
} from "~/constants/storage-keys";
import { useQueryClient } from "@tanstack/react-query";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";

// NOTE: State-only for now. TODO: persist to storage later.
export type Allergen = "milk" | "eggs" | "nuts" | "fish" | "shellfish" | "wheat";

const ALLERGEN_OPTIONS: GroupButton<Allergen>[] = [
  { label: "Milk (dairy)", icon: <MilkIcon />, value: "milk" },
  { label: "Eggs", icon: <EggIcon />, value: "eggs" },
  { label: "Nuts", icon: <NutIcon />, value: "nuts" },
  { label: "Fish", icon: <FishIcon />, value: "fish" },
  { label: "Shellfish", icon: <ShrimpIcon />, value: "shellfish" },
  { label: "Wheat", icon: <WheatIcon />, value: "wheat" },
];

export default function AllergySection() {
  const queryClient = useQueryClient();

  const [allergens, setAllergens] = useState<Allergen[]>(
    (() => {
      const stored = storage.get(PREF_ALLERGENS_KEY);
      if (typeof stored !== "string" || !stored) return [];
      return stored.split(",") as Allergen[];
    })()
  );
  const [otherAllergens, setOtherAllergens] = useState<string>(
    storage.get(PREF_OTHER_ALLERGENS_KEY) || ""
  );

  const handleToggleAllergens = useCallback(
    (allergen: Allergen) => {
      setAllergens((prev) => {
        const currentAllergens = toggleFromArray(prev, allergen);
        storage.set(PREF_ALLERGENS_KEY, currentAllergens.join(","));
        return currentAllergens;
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.expiringRecipes(),
      });
    },
    [queryClient]
  );

  const updateOtherAllergens = useCallback(
    (text: string) => {
      setOtherAllergens(text);
      storage.set(PREF_OTHER_ALLERGENS_KEY, text);
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.recommendations(),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.expiringRecipes(),
      });
    },
    [queryClient]
  );

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <View className="gap-1">
          <H4 className="font-urbanist-bold">Allergens</H4>
        </View>
        <GridButtons
          buttons={ALLERGEN_OPTIONS}
          value={allergens}
          onValueChange={handleToggleAllergens}
        />
        <View className="mt-4 gap-2">
          <P className="text-muted-foreground font-urbanist-medium">
            Other allergens (comma-separated)
          </P>
          <TextInput
            value={otherAllergens}
            onChangeText={updateOtherAllergens}
            placeholder="e.g., sesame, wheat, soy, mustard, celery, lupin, sulphites"
            className="rounded-2xl border-continuous border-border px-4 py-3 text-foreground bg-background font-urbanist-regular"
            placeholderTextColor={Platform.select({
              ios: "#9BA3AF",
              default: "rgba(255,255,255,0.4)",
            })}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </CardContent>
    </Card>
  );
}
