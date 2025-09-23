import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { ChefHatIcon } from "lucide-nativewind";
import { H4 } from "~/components/ui/typography";
import TextShimmer from "~/components/ui/TextShimmer";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";
import { usePantryStore } from "~/store/PantryContext";
import { storage } from "~/data";
import { PREFERENCE_COMPLETED_KEY } from "~/constants/storage-keys";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function RecipeButton() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { isRecipeOpen, updateRecipeOpen } = usePantryStore();
  const [isFirstTime, setIsFirstTime] = useState(
    !storage.get(PREFERENCE_COMPLETED_KEY)
  );

  const recipeButtonStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(
          isRecipeOpen ? 0 : 1,
          CURVES["expressive.fast.spatial"]
        ),
      },
    ],
  }));

  const onRecipeButtonPress = () => {
    if (isFirstTime) {
      // If preferences not set, navigate to preferences screen
      router.push("/preferences");
      setIsFirstTime(false);
      return;
    }
    updateRecipeOpen(!isRecipeOpen);
  };

  return (
    <Animated.View
      className="absolute left-0 right-0 flex-row justify-center"
      style={[{ bottom: bottom + 8 }, recipeButtonStyle]}
    >
      <Button
        size="lg"
        variant="secondary"
        className="rounded-2xl border-continuous bg-foreground/80"
        onPress={onRecipeButtonPress}
      >
        <TextShimmer className="flex-row items-center gap-2 justify-center">
          <>
            <ChefHatIcon
              className="text-background"
              size={18}
              strokeWidth={3}
            />
            <H4 className="text-background font-urbanist font-semibold">
              Let's Cook
            </H4>
          </>
        </TextShimmer>
      </Button>
    </Animated.View>
  );
}
