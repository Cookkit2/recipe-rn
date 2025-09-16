import { useCallback, useState } from "react";
import SegmentedButtons, { type GroupButton } from "../Shared/SegmentedButtons";
import { Card, CardContent } from "../ui/card";
import { H4 } from "../ui/typography";
import { MoonIcon, SaladIcon, VeganIcon, FishIcon } from "lucide-nativewind";
import { StarNorthIcon } from "~/lib/icons/StarNorth";
import { storage } from "~/data";
import { PREF_DIET_KEY } from "~/constants/storage-keys";

// NOTE: State-only for now. TODO: persist to storage later.
type Diet = "halal" | "kosher" | "vegetarian" | "vegan" | "pescatarian";

const DIET_OPTIONS: GroupButton<Diet>[] = [
  { label: "Halal", icon: <MoonIcon />, value: "halal" },
  { label: "Kosher", icon: <StarNorthIcon />, value: "kosher" },
  { label: "Vegetarian", icon: <SaladIcon />, value: "vegetarian" },
  { label: "Vegan", icon: <VeganIcon />, value: "vegan" },
  { label: "Pescatarian", icon: <FishIcon />, value: "pescatarian" },
];

export default function DietarySection() {
  const [diet, setDiet] = useState<Diet | undefined>(
    storage.get(PREF_DIET_KEY) || undefined
  );

  const handleToggleDiet = useCallback((diet: Diet) => {
    setDiet(diet);
    storage.set(PREF_DIET_KEY, diet);
  }, []);

  return (
    <Card className="mx-6 mt-4 border-none shadow-none">
      <CardContent className="py-6 gap-3 bg-muted/50 rounded-3xl">
        <H4 className="font-urbanist-bold">Dietary Preference</H4>
        <SegmentedButtons
          buttons={DIET_OPTIONS}
          value={diet}
          onValueChange={handleToggleDiet}
        />
      </CardContent>
    </Card>
  );
}
