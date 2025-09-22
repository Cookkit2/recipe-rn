import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H4 } from "~/components/ui/typography";
import { useRecipeSteps } from "~/store/RecipeStepsContext";
import TextLoop from "~/components/ui/TextLoop";
import { useRecipeDetailStore } from "~/store/RecipeDetailContext";

export default function StepBottomBar() {
  const { bottom } = useSafeAreaInsets();
  const { goToNextStep, loopRef } = useRecipeSteps();
  const { servings } = useRecipeDetailStore();

  return (
    <View
      className="flex-row justify-between items-center px-6 py-4"
      style={{ paddingBottom: bottom + 16 }}
    >
      <Button
        size="lg"
        onPress={() => goToNextStep(servings)}
        className="bg-foreground/80 min-w-full"
      >
        <TextLoop ref={loopRef} trigger={false}>
          <H4 className="font-urbanist-medium text-background">Continue</H4>
          <H4 className="font-urbanist-medium text-background">Finish</H4>
        </TextLoop>
      </Button>
    </View>
  );
}
