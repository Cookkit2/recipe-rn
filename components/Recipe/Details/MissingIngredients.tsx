import { View } from "react-native";
import { H4, P, Small } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";

interface MissingIngredientsProps {
  memoizedMissingIngredients: string;
  isInPlan: boolean;
  isAddingToPlan: boolean;
  onAddToPlan: () => void;
}

export default function MissingIngredients({
  memoizedMissingIngredients,
  isInPlan,
  isAddingToPlan,
  onAddToPlan,
}: MissingIngredientsProps) {
  if (!memoizedMissingIngredients) {
    return null;
  }

  return (
    <View className="mt-6 bg-card/80 rounded-xl px-6 py-4">
      <View className="flex-row items-center justify-between">
        <H4 className="font-urbanist-semibold text-destructive/60 mb-2">Missing Ingredients</H4>
        {/* {!isInPlan && (
          <Button variant="ghost" size="sm" onPress={onAddToPlan} disabled={isAddingToPlan}>
            <Small className="font-urbanist-semibold text-foreground/50">
              {isAddingToPlan ? "Adding..." : "Add to Grocery"}
            </Small>
          </Button>
        )} */}
      </View>
      <P className="font-urbanist-regular text-muted-foreground/70 leading-6">
        {memoizedMissingIngredients}
      </P>
    </View>
  );
}
