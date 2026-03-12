import { useCallback, useState } from "react";
import SegmentedButtons, { type GroupButton } from "~/components/Shared/SegmentedButtons";
import { Card, CardContent } from "~/components/ui/card";
import { H4 } from "~/components/ui/typography";
import { MoonIcon, SaladIcon, VeganIcon, FishIcon, BadgeXIcon } from "lucide-uniwind";
import { StarNorthIcon } from "~/lib/icons/StarNorth";
import { storage } from "~/data";
import { PREF_DIET_KEY } from "~/constants/storage-keys";
import { useQueryClient } from "@tanstack/react-query";
import { recipeQueryKeys } from "~/hooks/queries/recipeQueryKeys";

// NOTE: State-only for now. TODO: persist to storage later.
export type Diet = "halal" | "kosher" | "vegetarian" | "vegan" | "pescatarian" | "none";

const DIET_OPTIONS: GroupButton<Diet>[] = [
  { label: "None", icon: <BadgeXIcon />, value: "none" },
  { label: "Halal", icon: <MoonIcon />, value: "halal" },
  { label: "Kosher", icon: <StarNorthIcon />, value: "kosher" },
  { label: "Vegetarian", icon: <SaladIcon />, value: "vegetarian" },
  { label: "Vegan", icon: <VeganIcon />, value: "vegan" },
  { label: "Pescatarian", icon: <FishIcon />, value: "pescatarian" },
];

export default function DietarySection() {
  const queryClient = useQueryClient();
  const [diet, setDiet] = useState<Diet | undefined>(storage.get(PREF_DIET_KEY) || undefined);

  const handleToggleDiet = useCallback(
    (diet: Diet) => {
      setDiet(diet);
      storage.set(PREF_DIET_KEY, diet);
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
        <H4 className="font-urbanist-bold">Dietary Preference</H4>
        <SegmentedButtons
          columns={3}
          buttons={DIET_OPTIONS}
          value={diet}
          onValueChange={handleToggleDiet}
        />
      </CardContent>
    </Card>
  );
}
